import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { supabase } from '@/integrations/supabase/client';
import { generateInvoiceNumber } from '@/utils/invoiceUtils';

interface TicketData {
  booking: {
    id: string;
    quantity: number;
    total_price: number;
    booking_date: string;
    convenience_fee?: number;
    event_occurrence_id?: string;
    occurrence_ticket_category_id?: string;
    seat_numbers?: Array<{
      price: number;
      seat_number: string;
      seat_category: string;
    }> | null;
  };
  event: {
    name: string;
    start_datetime: string;
    venue?: {
      name: string;
      city: string;
      address: string;
    } | null;
    category?: string;
    sub_category?: string;
    genre?: string;
    genres?: string[];
    language?: string;
    duration?: number;
    tags?: string[];
    artist_name?: string;
    artists?: Array<{
      name: string;
      image?: string;
    }>;
    is_recurring?: boolean;
    event_time?: string;
  };
  customerInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  selectedSeats?: any[];
  totalPrice: number;
  basePrice: number;
  convenienceFee: number;
  formattedBookingId?: string;
  selectedGeneralTickets?: Array<{
    categoryId: string;
    categoryName: string;
    quantity: number;
    basePrice: number;
    convenienceFee: number;
    totalPrice: number;
  }>;
  eventOccurrenceId?: string;
}

interface BackendPricing {
  basePrice: number;
  convenienceFee: number;
  gstAmount: number;
  totalPrice: number;
  actualTotalQuantity?: number;
  categoryBreakdown?: Array<{
    category: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  customerData?: {
    name: string;
    email: string;
    phone: string;
  };
  occurrenceData?: {
    occurrence_date: string;
    occurrence_time: string;
  };
  eventTime?: string; // Add event_time from event table
}

// Enhanced pricing data fetch for recurring events with occurrence-specific data
const fetchPricingData = async (bookingId: string): Promise<BackendPricing | null> => {
  try {
    console.log('Fetching pricing data for booking:', bookingId);
    
    // Get booking with detailed information including occurrence data
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        seat_numbers,
        total_price,
        convenience_fee,
        customer_name,
        customer_email,
        customer_phone,
        event_occurrence_id,
        occurrence_ticket_category_id,
        event:events!inner(
          id,
          name,
          category,
          is_recurring,
          event_time
        ),
        event_occurrences!left(
          id,
          occurrence_date,
          occurrence_time
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError) {
      console.error('Error fetching booking:', bookingError);
      return null;
    }

    if (!booking) {
      console.error('No booking found for ID:', bookingId);
      return null;
    }

    console.log('Fetched booking data for PDF pricing:', booking);

    let basePrice = 0;
    let convenienceFeeFromDB = booking.convenience_fee || 0;
    let totalPrice = booking.total_price || 0;
    let actualTotalQuantity = 0;
    const categoryBreakdown: Array<{
      category: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }> = [];

    // Get occurrence-specific data for recurring events
    let occurrenceData = null;
    if (booking.event_occurrence_id && booking.event_occurrences) {
      occurrenceData = {
        occurrence_date: booking.event_occurrences.occurrence_date,
        occurrence_time: booking.event_occurrences.occurrence_time
      };
      console.log('Found occurrence data for PDF:', occurrenceData);
    }

    // Enhanced handling for recurring events with occurrence data
    if (booking.event_occurrence_id && booking.occurrence_ticket_category_id) {
      console.log('Processing recurring event booking with occurrence ID:', booking.event_occurrence_id);
      
      // Get occurrence ticket category data
      const { data: occurrenceCategory, error: categoryError } = await supabase
        .from('occurrence_ticket_categories')
        .select('*')
        .eq('id', booking.occurrence_ticket_category_id)
        .single();

      if (!categoryError && occurrenceCategory) {
        console.log('Found occurrence category data:', occurrenceCategory);
        
        const categoryName = occurrenceCategory.category_name;
        const categoryBasePrice = occurrenceCategory.base_price;
        const categoryQuantity = booking.quantity;
        
        categoryBreakdown.push({
          category: categoryName,
          quantity: categoryQuantity,
          unitPrice: categoryBasePrice,
          totalPrice: categoryBasePrice * categoryQuantity
        });
        
        basePrice = categoryBasePrice * categoryQuantity;
        actualTotalQuantity = categoryQuantity;
      }
    }

    // Fallback: Handle seat_numbers data with proper category breakdown
    if (categoryBreakdown.length === 0 && booking.seat_numbers && Array.isArray(booking.seat_numbers)) {
      console.log('Processing seat_numbers data for category breakdown');
      
      const categoryCountMap = new Map<string, { quantity: number; totalPrice: number; unitPrice: number }>();
      let totalQuantityFromSeats = 0;
      
      booking.seat_numbers.forEach((seat: any) => {
        const category = seat.seat_category || seat.category || 'General';
        const price = seat.price || seat.base_price || 0;
        let quantity = 1;
        if (seat.quantity) {
          quantity = typeof seat.quantity === 'string' ? parseInt(seat.quantity, 10) : seat.quantity;
        } else if (seat.booked_quantity) {
          quantity = typeof seat.booked_quantity === 'string' ? parseInt(seat.booked_quantity, 10) : seat.booked_quantity;
        }
        
        totalQuantityFromSeats += quantity;
        
        console.log(`Processing seat entry:`, { category, price, quantity, seat });
        
        if (!categoryCountMap.has(category)) {
          categoryCountMap.set(category, { quantity: 0, totalPrice: 0, unitPrice: price });
        }
        
        const current = categoryCountMap.get(category)!;
        current.quantity += quantity;
        current.totalPrice += price * quantity;
        basePrice += price * quantity;
      });

      actualTotalQuantity = totalQuantityFromSeats;

      categoryCountMap.forEach((data, category) => {
        categoryBreakdown.push({
          category,
          quantity: data.quantity,
          unitPrice: data.unitPrice,
          totalPrice: data.totalPrice
        });
      });
    }

    // Final fallback calculation
    if (basePrice === 0) {
      basePrice = totalPrice - convenienceFeeFromDB;
      actualTotalQuantity = booking.quantity;
      
      if (categoryBreakdown.length === 0) {
        categoryBreakdown.push({
          category: 'General Admission',
          quantity: booking.quantity,
          unitPrice: basePrice / booking.quantity,
          totalPrice: basePrice
        });
      }
    }

    // Calculate convenience fee breakdown (base fee + GST)
    const convenienceFeeBeforeGst = convenienceFeeFromDB > 0 ? convenienceFeeFromDB / 1.18 : 0;
    const gstAmount = convenienceFeeFromDB > 0 ? convenienceFeeFromDB - convenienceFeeBeforeGst : 0;

    console.log('Final calculated pricing for PDF:', {
      basePrice,
      convenienceFee: convenienceFeeBeforeGst,
      gstAmount,
      totalPrice,
      categoryBreakdown,
      actualTotalQuantity,
      occurrenceData
    });

    return {
      basePrice,
      convenienceFee: convenienceFeeBeforeGst,
      gstAmount,
      totalPrice,
      categoryBreakdown,
      actualTotalQuantity,
      customerData: {
        name: booking.customer_name,
        email: booking.customer_email,
        phone: booking.customer_phone
      },
      occurrenceData,
      eventTime: booking.event?.event_time // Add event_time from event table
    };
  } catch (error) {
    console.error('Error in fetchPricingData:', error);
    return null;
  }
};

// Enhanced responsive PDF configuration with better mobile support
const getResponsiveConfig = (pageWidth: number, pageHeight: number) => {
  const isSmallFormat = pageWidth < 150 || pageHeight < 200;
  const isMediumFormat = pageWidth >= 150 && pageWidth < 200;
  const isLargeFormat = pageWidth >= 200;
  
  // Dynamic scaling based on actual page dimensions
  const baseScale = Math.min(pageWidth / 210, pageHeight / 297); // A4 reference
  
  return {
    margin: Math.max(8, pageWidth * 0.035),
    headerHeight: isSmallFormat ? 18 : (isMediumFormat ? 25 : 32),
    fontSize: {
      title: Math.max(12, Math.min(20, pageWidth * 0.065 * baseScale)),
      subtitle: Math.max(7, Math.min(12, pageWidth * 0.028 * baseScale)),
      heading: Math.max(9, Math.min(14, pageWidth * 0.032 * baseScale)),
      body: Math.max(7, Math.min(11, pageWidth * 0.024 * baseScale)),
      small: Math.max(6, Math.min(9, pageWidth * 0.020 * baseScale))
    },
    lineHeight: isSmallFormat ? 3.5 : (isMediumFormat ? 5 : 6.5),
    sectionSpacing: isSmallFormat ? 6 : (isMediumFormat ? 9 : 14),
    qrSize: Math.max(25, Math.min(60, pageWidth * 0.14)),
    columnSplit: isSmallFormat ? 0.95 : (isMediumFormat ? 0.65 : 0.58), // Single column for small screens
    contentPadding: Math.max(3, pageWidth * 0.015),
    maxTextWidth: isSmallFormat ? pageWidth * 0.85 : pageWidth * 0.45
  };
};

// Helper function to check if content fits on current page
const checkPageSpace = (doc: jsPDF, currentY: number, requiredSpace: number) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  const bottomMargin = 20;
  return (currentY + requiredSpace) > (pageHeight - bottomMargin);
};

// Helper function to add a new page with header
const addNewPageWithHeader = (doc: jsPDF, config: any, contentWidth: number) => {
  doc.addPage();
  
  // Colors
  const yellowColor: [number, number, number] = [255, 255, 0];
  const blackColor: [number, number, number] = [0, 0, 0];
  
  // Header with yellow background
  doc.setFillColor(...yellowColor);
  doc.rect(config.margin, 15, contentWidth, config.headerHeight, 'F');
  
  // Header text
  doc.setTextColor(...blackColor);
  doc.setFontSize(config.fontSize.title);
  doc.setFont('helvetica', 'bold');
  doc.text('TICKETOOZ.COM', config.margin + config.contentPadding, 28);
  
  doc.setFontSize(config.fontSize.subtitle);
  doc.setFont('helvetica', 'normal');
  doc.text('Your Event Ticket (Continued)', config.margin + config.contentPadding, 38);
  
  return 55; // Return starting Y position for content
};

// Responsive text rendering with better line breaking
const addResponsiveText = (doc: jsPDF, text: string, x: number, y: number, maxWidth: number, fontSize: number, config: any) => {
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(text, maxWidth);
  let currentY = y;
  
  (Array.isArray(lines) ? lines : [lines]).forEach((line: string) => {
    if (checkPageSpace(doc, currentY, config.lineHeight)) {
      currentY = addNewPageWithHeader(doc, config, maxWidth);
    }
    doc.text(line, x, currentY);
    currentY += config.lineHeight;
  });
  
  return currentY;
};

// Enhanced category display with responsive layout
const displayResponsiveTicketBreakdown = (doc: jsPDF, ticketData: TicketData, backendPricing: BackendPricing | null, layout: any, currentY: number, config: any) => {
  const isGeneralAdmission = !ticketData.selectedSeats || ticketData.selectedSeats.length === 0;
  
  // Responsive section header
  doc.setFontSize(config.fontSize.heading);
  doc.setFont('helvetica', 'bold');
  doc.text(layout.useStacked ? 'Tickets' : 'Ticket Information', layout.rightColumnX, currentY);
  
  currentY += config.sectionSpacing;
  doc.setFontSize(config.fontSize.body);
  doc.setFont('helvetica', 'normal');
  
  if (isGeneralAdmission) {
    // Responsive general admission display
    doc.text('Type:', layout.rightColumnX, currentY);
    currentY += config.lineHeight;
    
    const categoryParts: string[] = [];
    
    // Enhanced category logic (same as before)
    if (ticketData.event.is_recurring && backendPricing && backendPricing.categoryBreakdown && backendPricing.categoryBreakdown.length > 0) {
      backendPricing.categoryBreakdown.forEach((category) => {
        categoryParts.push(`${category.category} × ${category.quantity}`);
      });
    } else if (ticketData.selectedGeneralTickets && ticketData.selectedGeneralTickets.length > 0) {
      ticketData.selectedGeneralTickets.forEach((ticket) => {
        categoryParts.push(`${ticket.categoryName} × ${ticket.quantity}`);
      });
    } else if (ticketData.booking.seat_numbers && Array.isArray(ticketData.booking.seat_numbers)) {
      const categoryMap = new Map<string, number>();
      ticketData.booking.seat_numbers.forEach((seat: any) => {
        const category = seat.seat_category || seat.category || 'General';
        let quantity = 1;
        if (seat.quantity) {
          quantity = typeof seat.quantity === 'string' ? parseInt(seat.quantity, 10) : seat.quantity;
        } else if (seat.booked_quantity) {
          quantity = typeof seat.booked_quantity === 'string' ? parseInt(seat.booked_quantity, 10) : seat.booked_quantity;
        }
        categoryMap.set(category, (categoryMap.get(category) || 0) + quantity);
      });
      categoryMap.forEach((quantity, category) => {
        categoryParts.push(`${category} × ${quantity}`);
      });
    } else {
      categoryParts.push(`General × ${ticketData.booking.quantity}`);
    }
    
    const ticketSummary = categoryParts.join(', ');
    currentY = addResponsiveText(doc, ticketSummary, layout.rightColumnX, currentY, layout.rightColumnWidth, config.fontSize.body, config);
    currentY += config.lineHeight;
    
  } else {
    // Responsive seat-based display
    const seatsByCategory = new Map<string, string[]>();
    
    if (ticketData.selectedSeats && ticketData.selectedSeats.length > 0) {
      ticketData.selectedSeats.forEach(seat => {
        const category = seat.seat_categories?.name || seat.category_name || seat.category || 'General';
        const seatNumber = `${seat.row_name || ''}${seat.seat_number}`;
        
        if (!seatsByCategory.has(category)) {
          seatsByCategory.set(category, []);
        }
        seatsByCategory.get(category)!.push(seatNumber);
      });
    } else if (ticketData.booking.seat_numbers) {
      ticketData.booking.seat_numbers.forEach(seat => {
        const category = seat.seat_category || 'General';
        if (!seatsByCategory.has(category)) {
          seatsByCategory.set(category, []);
        }
        seatsByCategory.get(category)!.push(seat.seat_number);
      });
    }
    
    const categoryParts: string[] = [];
    seatsByCategory.forEach((seats, category) => {
      categoryParts.push(`${category}: ${seats.join(', ')}`);
    });
    
    const seatsDisplayText = categoryParts.join(' ');
    currentY = addResponsiveText(doc, seatsDisplayText, layout.rightColumnX, currentY, layout.rightColumnWidth, config.fontSize.body, config);
  }
  
  currentY += config.sectionSpacing;
  
  // Responsive total seats display
  let totalSeats = ticketData.booking.quantity;
  if (backendPricing && backendPricing.actualTotalQuantity) {
    totalSeats = backendPricing.actualTotalQuantity;
  } else if (backendPricing && backendPricing.categoryBreakdown) {
    totalSeats = backendPricing.categoryBreakdown.reduce((sum, category) => sum + category.quantity, 0);
  } else if (ticketData.selectedGeneralTickets) {
    totalSeats = ticketData.selectedGeneralTickets.reduce((sum, ticket) => sum + ticket.quantity, 0);
  }
  
  doc.text('Total:', layout.rightColumnX, currentY);
  doc.text(totalSeats.toString(), layout.rightColumnX + (config.fontSize.body * 2), currentY);
  
  return currentY + config.sectionSpacing;
};

export const generateTicketPDF = async (ticketData: TicketData & { eventOccurrenceId?: string }) => {
  console.log('Generating responsive PDF for booking:', ticketData.booking.id);

  // Check if this is a combined booking
  const isCombinedBooking = (ticketData.booking as any).is_combined || false;
  const combinedBookingIds = (ticketData.booking as any).combined_booking_ids || [];

  // Fetch actual pricing data from backend including convenience fee and customer info
  const backendPricing = await fetchPricingData(ticketData.booking.id);
  
  console.log('Backend pricing data for PDF:', backendPricing);
  
  // Enhanced customer info extraction - prioritize booking data over user metadata
  let customerInfo = ticketData.customerInfo;
  
  if (backendPricing?.customerData && backendPricing.customerData.name) {
    const fullName = backendPricing.customerData.name.trim();
    console.log('Full name from booking data:', fullName);
    
    // Improved name parsing logic
    const nameParts = fullName.split(' ').filter(part => part.length > 0);
    let firstName = '';
    let lastName = '';
    
    if (nameParts.length === 1) {
      firstName = nameParts[0];
      lastName = '';
    } else if (nameParts.length >= 2) {
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(' '); // Join all parts after first as last name
    }
    
    customerInfo = {
      firstName: firstName,
      lastName: lastName,
      email: backendPricing.customerData.email || ticketData.customerInfo.email,
      phone: backendPricing.customerData.phone || ticketData.customerInfo.phone
    };
    
    console.log('Updated customer info from booking data:', {
      originalFullName: fullName,
      nameParts: nameParts,
      firstName,
      lastName,
      email: customerInfo.email,
      phone: customerInfo.phone
    });
  }
  
  // Generate formatted booking ID using invoice utils
  const formattedBookingId = generateInvoiceNumber(ticketData.booking.id, ticketData.booking.booking_date);
  console.log('Generated formatted booking ID for PDF:', formattedBookingId);

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Get enhanced responsive configuration
  const config = getResponsiveConfig(pageWidth, pageHeight);
  const layout = getLayoutConfig(config, pageWidth);
  
  // Colors - properly typed as tuples
  const yellowColor: [number, number, number] = [255, 255, 0];
  const blackColor: [number, number, number] = [0, 0, 0];
  const whiteColor: [number, number, number] = [255, 255, 255];
  const grayColor: [number, number, number] = [128, 128, 128];
  
  const contentWidth = pageWidth - (config.margin * 2);
  
  // Responsive header with yellow background
  doc.setFillColor(...yellowColor);
  doc.rect(config.margin, 15, contentWidth, config.headerHeight, 'F');
  
  // Responsive header text
  doc.setTextColor(...blackColor);
  doc.setFontSize(config.fontSize.title);
  doc.setFont('helvetica', 'bold');
  doc.text('TICKETOOZ.COM', config.margin + config.contentPadding, 28);
  
  doc.setFontSize(config.fontSize.subtitle);
  doc.setFont('helvetica', 'normal');
  const ticketTypeText = isCombinedBooking ? 'Your Combined Event Tickets' : 'Your Event Ticket';
  doc.text(ticketTypeText, config.margin + config.contentPadding, 38);
  
  // Responsive main content area
  let currentY = 55;
  
  // Event Details Section with responsive layout
  if (checkPageSpace(doc, currentY, 60)) {
    currentY = addNewPageWithHeader(doc, config, contentWidth);
  }
  
  doc.setFontSize(config.fontSize.heading);
  doc.setFont('helvetica', 'bold');
  doc.text('Event Details', layout.leftColumnX, currentY);
  
  currentY += config.sectionSpacing;
  const detailsStartY = currentY;
  doc.setFontSize(config.fontSize.body);
  doc.setFont('helvetica', 'normal');
  
  // Responsive event information
  doc.text('Event:', layout.leftColumnX, currentY);
  currentY += config.lineHeight;
  currentY = addResponsiveText(doc, ticketData.event.name || 'Event Name', layout.leftColumnX, currentY, layout.leftColumnWidth, config.fontSize.body, config);
  currentY += config.lineHeight;
  
  // Responsive date & time with enhanced formatting
  if (checkPageSpace(doc, currentY, 20)) {
    currentY = addNewPageWithHeader(doc, config, contentWidth);
  }
  
  doc.text('Date & Time:', layout.leftColumnX, currentY);
  
  // Enhanced date/time logic (same as before)
  let eventDate: Date;
  let dateStr: string;
  let timeStr: string;
  
  if (ticketData.event.is_recurring && backendPricing?.occurrenceData) {
    const occurrenceDate = new Date(backendPricing.occurrenceData.occurrence_date);
    dateStr = occurrenceDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    const eventTime = backendPricing.eventTime || ticketData.event.event_time;
    if (eventTime) {
      const [hours, minutes] = eventTime.split(':').map(Number);
      const timeDate = new Date();
      timeDate.setHours(hours, minutes, 0, 0);
      
      timeStr = timeDate.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      });
    } else {
      const occurrenceDateTime = `${backendPricing.occurrenceData.occurrence_date}T${backendPricing.occurrenceData.occurrence_time}`;
      eventDate = new Date(occurrenceDateTime);
      timeStr = eventDate.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      });
    }
  } else {
    eventDate = new Date(ticketData.event.start_datetime);
    dateStr = eventDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    timeStr = eventDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    });
  }
  
  currentY = addResponsiveText(doc, `${dateStr} at ${timeStr}`, layout.leftColumnX, currentY + config.lineHeight, layout.leftColumnWidth, config.fontSize.body, config);
  currentY += config.lineHeight;
  
  // Responsive venue information
  if (checkPageSpace(doc, currentY, 20)) {
    currentY = addNewPageWithHeader(doc, config, contentWidth);
  }
  
  doc.text('Venue:', layout.leftColumnX, currentY);
  currentY += config.lineHeight;
  currentY = addResponsiveText(doc, ticketData.event.venue?.name || 'TBA', layout.leftColumnX, currentY, layout.leftColumnWidth, config.fontSize.body, config);
  currentY += config.lineHeight;
  
  doc.text('Address:', layout.leftColumnX, currentY);
  currentY += config.lineHeight;
  currentY = addResponsiveText(doc, ticketData.event.venue?.address || 'TBA', layout.leftColumnX, currentY, layout.leftColumnWidth, config.fontSize.body, config);
  
  // Responsive ticket information section
  let ticketY = layout.useStacked ? currentY + config.sectionSpacing * 2 : detailsStartY;
  
  if (!layout.useStacked && checkPageSpace(doc, ticketY, 100)) {
    ticketY = addNewPageWithHeader(doc, config, contentWidth);
  }
  
  ticketY = displayResponsiveTicketBreakdown(doc, ticketData, backendPricing, layout, ticketY, config);
  
  // Responsive customer information section
  currentY = Math.max(currentY, ticketY) + config.sectionSpacing;
  
  if (checkPageSpace(doc, currentY, 80)) {
    currentY = addNewPageWithHeader(doc, config, contentWidth);
  }
  
  doc.setFontSize(config.fontSize.heading);
  doc.setFont('helvetica', 'bold');
  doc.text('Customer Information', layout.leftColumnX, currentY);
  
  currentY += config.sectionSpacing;
  const guestStartY = currentY;
  doc.setFontSize(config.fontSize.body);
  doc.setFont('helvetica', 'normal');
  
  // Responsive customer details
  doc.text('Name:', layout.leftColumnX, currentY);
  currentY += config.lineHeight;
  
  const firstName = customerInfo.firstName || '';
  const lastName = customerInfo.lastName || '';
  const fullName = `${firstName}${lastName ? ' ' + lastName : ''}`.trim();
  
  if (fullName) {
    currentY = addResponsiveText(doc, fullName, layout.leftColumnX, currentY, layout.leftColumnWidth, config.fontSize.body, config);
  } else {
    currentY = addResponsiveText(doc, 'Guest User', layout.leftColumnX, currentY, layout.leftColumnWidth, config.fontSize.body, config);
  }
  currentY += config.lineHeight;

  doc.text('Email:', layout.leftColumnX, currentY);
  currentY += config.lineHeight;
  currentY = addResponsiveText(doc, customerInfo.email, layout.leftColumnX, currentY, layout.leftColumnWidth, config.fontSize.body, config);
  currentY += config.lineHeight;
  
  doc.text('Phone:', layout.leftColumnX, currentY);
  currentY = addResponsiveText(doc, customerInfo.phone, layout.leftColumnX, currentY + config.lineHeight, layout.leftColumnWidth, config.fontSize.body, config);
  currentY += config.lineHeight * 2;
  
  // Responsive booking ID display
  if (isCombinedBooking && combinedBookingIds.length > 0) {
    doc.text('Combined Booking IDs:', layout.leftColumnX, currentY);
    currentY += config.lineHeight;
    combinedBookingIds.forEach((id: string, index: number) => {
      const formattedCombinedId = generateInvoiceNumber(id, ticketData.booking.booking_date);
      const shortId = formattedCombinedId.slice(0, 20) + (formattedCombinedId.length > 20 ? '...' : '');
      currentY = addResponsiveText(doc, `${index + 1}. ${shortId}`, layout.leftColumnX, currentY, layout.leftColumnWidth, config.fontSize.body, config);
    });
  } else {
    doc.text('Booking ID:', layout.leftColumnX, currentY);
    currentY += config.lineHeight;
    currentY = addResponsiveText(doc, formattedBookingId, layout.leftColumnX, currentY, layout.leftColumnWidth, config.fontSize.body, config);
  }
  
  // Responsive QR Code positioning
  const qrX = layout.useStacked ? layout.leftColumnX : layout.rightColumnX;
  let qrY = layout.useStacked ? currentY + config.sectionSpacing : guestStartY;
  
  if (checkPageSpace(doc, qrY, config.qrSize + 20)) {
    qrY = addNewPageWithHeader(doc, config, contentWidth) + 20;
  }
  
  // Generate QR code with proper verification URL using formatted booking ID
  const verificationUrl = `${window.location.origin}/verify-ticket/${formattedBookingId}`;
  console.log('Generated QR verification URL:', verificationUrl);
  
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
      width: config.qrSize * 3,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    doc.addImage(qrCodeDataUrl, 'PNG', qrX, qrY, config.qrSize, config.qrSize);
    doc.setFontSize(config.fontSize.small);
    doc.setFont('helvetica', 'normal');
    doc.text('Scan to verify', qrX, qrY + config.qrSize + 5);
    
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1);
    doc.rect(qrX, qrY, config.qrSize, config.qrSize);
    
    doc.setFontSize(config.fontSize.small);
    doc.setFont('helvetica', 'bold');
    doc.text('QR Code', qrX + config.qrSize/2 - 12, qrY + config.qrSize/2 + 2);
    doc.text('Error', qrX + config.qrSize/2 - 8, qrY + config.qrSize/2 + 8);
  }
  
  // Responsive payment summary section
  currentY = Math.max(currentY, qrY + config.qrSize) + config.sectionSpacing * 2;
  
  if (checkPageSpace(doc, currentY, 100)) {
    currentY = addNewPageWithHeader(doc, config, contentWidth);
  }
  
  doc.setFontSize(config.fontSize.heading);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Summary', layout.leftColumnX, currentY);
  
  currentY += config.sectionSpacing;
  doc.setFontSize(config.fontSize.body);
  doc.setFont('helvetica', 'normal');
  
  // Responsive payment details (same logic as before but with responsive positioning)
  if (backendPricing) {
    if (backendPricing.categoryBreakdown && backendPricing.categoryBreakdown.length > 0) {
      backendPricing.categoryBreakdown.forEach((category) => {
        if (checkPageSpace(doc, currentY, 10)) {
          currentY = addNewPageWithHeader(doc, config, contentWidth);
        }
        
        doc.text(`${category.category} (×${category.quantity}):`, layout.leftColumnX, currentY);
        doc.text(`₹${category.totalPrice.toFixed(2)}`, layout.leftColumnX + 70, currentY);
        currentY += config.lineHeight + 2;
      });
    } else {
      doc.text(`Tickets (×${ticketData.booking.quantity}):`, layout.leftColumnX, currentY);
      doc.text(`₹${backendPricing.basePrice.toFixed(2)}`, layout.leftColumnX + 70, currentY);
      currentY += config.lineHeight + 2;
    }
    
    if (backendPricing.convenienceFee > 0) {
      doc.text('Convenience Fee:', layout.leftColumnX, currentY);
      doc.text(`₹${backendPricing.convenienceFee.toFixed(2)}`, layout.leftColumnX + 70, currentY);
      currentY += config.lineHeight + 2;
      
      if (backendPricing.gstAmount > 0) {
        doc.text('GST (18%):', layout.leftColumnX, currentY);
        doc.text(`₹${backendPricing.gstAmount.toFixed(2)}`, layout.leftColumnX + 70, currentY);
        currentY += config.lineHeight + 2;
      }
    }
    
    doc.setFont('helvetica', 'bold');
    doc.text('Total Amount:', layout.leftColumnX, currentY);
    doc.text(`₹${backendPricing.totalPrice.toFixed(2)}`, layout.leftColumnX + 70, currentY);
  } else {
    // Fallback pricing display
    const totalPrice = ticketData.totalPrice;
    const convenienceFee = ticketData.convenienceFee || 0;
    const basePrice = totalPrice - convenienceFee;
    
    doc.text(`Tickets (×${ticketData.booking.quantity}):`, layout.leftColumnX, currentY);
    doc.text(`₹${basePrice.toFixed(2)}`, layout.leftColumnX + 70, currentY);
    currentY += config.lineHeight + 2;
    
    if (convenienceFee > 0) {
      const convenienceFeeBeforeGst = convenienceFee / 1.18;
      const gstAmount = convenienceFee - convenienceFeeBeforeGst;
      
      doc.text('Convenience Fee:', layout.leftColumnX, currentY);
      doc.text(`₹${convenienceFeeBeforeGst.toFixed(2)}`, layout.leftColumnX + 70, currentY);
      currentY += config.lineHeight + 2;
      
      if (gstAmount > 0) {
        doc.text('GST (18%):', layout.leftColumnX, currentY);
        doc.text(`₹${gstAmount.toFixed(2)}`, layout.leftColumnX + 70, currentY);
        currentY += config.lineHeight + 2;
      }
    }
    
    doc.setFont('helvetica', 'bold');
    doc.text('Total Amount:', layout.leftColumnX, currentY);
    doc.text(`₹${totalPrice.toFixed(2)}`, layout.leftColumnX + 70, currentY);
  }
  
  // Responsive important notices section
  const noticesX = layout.useStacked ? layout.leftColumnX : layout.rightColumnX;
  let noticesY = layout.useStacked ? currentY + config.sectionSpacing * 2 : Math.max(currentY - 80, guestStartY + config.qrSize + 40);
  
  if (checkPageSpace(doc, noticesY, 60)) {
    noticesY = addNewPageWithHeader(doc, config, contentWidth);
  }
  
  doc.setFontSize(config.fontSize.subtitle);
  doc.setFont('helvetica', 'bold');
  doc.text('IMPORTANT NOTICES:', noticesX, noticesY);
  
  noticesY += config.lineHeight + 2;
  doc.setFontSize(config.fontSize.small);
  doc.setFont('helvetica', 'normal');
  
  const notices = [
    '• Please bring this ticket and valid ID',
    '• Entry subject to security check',
    '• No refunds or exchanges allowed',
    '• Support: support@ticketooz.com'
  ];
  
  notices.forEach(notice => {
    if (checkPageSpace(doc, noticesY, 5)) {
      noticesY = addNewPageWithHeader(doc, config, contentWidth);
    }
    noticesY = addResponsiveText(doc, notice, noticesX, noticesY, layout.useStacked ? layout.leftColumnWidth : layout.rightColumnWidth, config.fontSize.small, config);
  });
  
  // Download the PDF with formatted booking ID
  doc.save(`ticket-${formattedBookingId}.pdf`);
};

// Enhanced responsive layout manager
const getLayoutConfig = (config: any, pageWidth: number) => {
  const isSmallLayout = pageWidth < 150;
  
  if (isSmallLayout) {
    // Single column layout for small screens
    return {
      leftColumnX: config.margin + config.contentPadding,
      rightColumnX: config.margin + config.contentPadding,
      leftColumnWidth: pageWidth - (config.margin * 2) - (config.contentPadding * 2),
      rightColumnWidth: pageWidth - (config.margin * 2) - (config.contentPadding * 2),
      useStacked: true
    };
  } else {
    // Two column layout for larger screens
    return {
      leftColumnX: config.margin + config.contentPadding,
      rightColumnX: pageWidth * config.columnSplit,
      leftColumnWidth: (pageWidth * config.columnSplit) - config.margin - (config.contentPadding * 2),
      rightColumnWidth: pageWidth * (1 - config.columnSplit) - config.margin - config.contentPadding,
      useStacked: false
    };
  }
};
