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

// Responsive PDF configuration
const getResponsiveConfig = (pageWidth: number, pageHeight: number) => {
  const isSmallFormat = pageWidth < 150 || pageHeight < 200;
  const isMediumFormat = pageWidth >= 150 && pageWidth < 200;
  
  return {
    margin: Math.max(10, pageWidth * 0.04),
    headerHeight: isSmallFormat ? 20 : 30,
    fontSize: {
      title: isSmallFormat ? 14 : Math.max(18, pageWidth * 0.06),
      subtitle: isSmallFormat ? 8 : Math.max(10, pageWidth * 0.025),
      heading: isSmallFormat ? 10 : Math.max(12, pageWidth * 0.03),
      body: isSmallFormat ? 7 : Math.max(9, pageWidth * 0.022),
      small: isSmallFormat ? 6 : Math.max(7, pageWidth * 0.018)
    },
    lineHeight: isSmallFormat ? 4 : 6,
    sectionSpacing: isSmallFormat ? 8 : 12,
    qrSize: isSmallFormat ? 30 : Math.min(50, pageWidth * 0.12)
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
  doc.text('TICKETOOZ.COM', config.margin + 5, 28);
  
  doc.setFontSize(config.fontSize.subtitle);
  doc.setFont('helvetica', 'normal');
  doc.text('Your Event Ticket (Continued)', config.margin + 5, 38);
  
  return 55; // Return starting Y position for content
};

// Helper function to split long text and handle line breaks
const splitText = (doc: jsPDF, text: string, maxWidth: number, fontSize: number) => {
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(text, maxWidth);
  return Array.isArray(lines) ? lines : [lines];
};

// Helper function to add text with automatic line breaks and pagination
const addTextWithLineBreaks = (doc: jsPDF, text: string, x: number, y: number, maxWidth: number, fontSize: number, lineHeight: number = 6) => {
  const lines = splitText(doc, text, maxWidth, fontSize);
  let currentY = y;
  
  lines.forEach((line: string) => {
    // Check if we need a new page
    if (checkPageSpace(doc, currentY, lineHeight)) {
      currentY = addNewPageWithHeader(doc, getResponsiveConfig(doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight()), maxWidth);
    }
    
    doc.text(line, x, currentY);
    currentY += lineHeight;
  });
  
  return currentY;
};

// Enhanced category display logic for recurring events
const displayTicketBreakdown = (doc: jsPDF, ticketData: TicketData, backendPricing: BackendPricing | null, rightColumnX: number, rightColumnY: number, rightColumnWidth: number, config: any) => {
  let currentY = rightColumnY;
  
  // Enhanced category display logic for recurring events
  const isGeneralAdmission = !ticketData.selectedSeats || ticketData.selectedSeats.length === 0;
  
  if (isGeneralAdmission) {
    // General Admission - Show ticket categories and quantities in summary format
    doc.text('Admission Type:', rightColumnX, currentY);
    currentY += config.lineHeight;
    
    // Create summary line - prioritize backend pricing for recurring events
    const categoryParts: string[] = [];
    
    // For recurring events, prioritize backend pricing category breakdown
    if (ticketData.event.is_recurring && backendPricing && backendPricing.categoryBreakdown && backendPricing.categoryBreakdown.length > 0) {
      console.log('Creating recurring event ticket summary from backend category breakdown:', backendPricing.categoryBreakdown);
      
      backendPricing.categoryBreakdown.forEach((category) => {
        categoryParts.push(`${category.category} × ${category.quantity}`);
      });
    }
    // Then try selectedGeneralTickets
    else if (ticketData.selectedGeneralTickets && ticketData.selectedGeneralTickets.length > 0) {
      console.log('Creating ticket summary from selectedGeneralTickets:', ticketData.selectedGeneralTickets);
      
      ticketData.selectedGeneralTickets.forEach((ticket) => {
        categoryParts.push(`${ticket.categoryName} × ${ticket.quantity}`);
      });
    }
    // Enhanced fallback for general admission with multiple categories from seat_numbers
    else if (ticketData.booking.seat_numbers && Array.isArray(ticketData.booking.seat_numbers)) {
      console.log('Creating ticket summary from seat_numbers:', ticketData.booking.seat_numbers);
      
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
    }
    // Final fallback
    else {
      categoryParts.push(`General Admission × ${ticketData.booking.quantity}`);
    }
    
    // Display the summary line
    const ticketSummary = categoryParts.join(', ');
    console.log('Final ticket summary for PDF:', ticketSummary);
    
    currentY = addTextWithLineBreaks(doc, ticketSummary, rightColumnX, currentY, rightColumnWidth, config.fontSize.body);
    currentY += config.lineHeight * 2;
    
    // Show detailed breakdown if there are multiple categories
    if (categoryParts.length > 1 || (backendPricing && backendPricing.categoryBreakdown && backendPricing.categoryBreakdown.length > 0)) {
      doc.setFontSize(config.fontSize.small);
      doc.text('Breakdown:', rightColumnX, currentY);
      currentY += config.lineHeight;
      
      // Show category breakdown from backend pricing (prioritized for recurring events)
      if (backendPricing && backendPricing.categoryBreakdown && backendPricing.categoryBreakdown.length > 0) {
        backendPricing.categoryBreakdown.forEach((category) => {
          if (checkPageSpace(doc, currentY, 25)) {
            currentY = addNewPageWithHeader(doc, config, rightColumnWidth);
            doc.setFontSize(config.fontSize.heading);
            doc.setFont('helvetica', 'bold');
            doc.text('Ticket Information (Continued)', rightColumnX, currentY);
            currentY += config.sectionSpacing;
            doc.setFontSize(config.fontSize.small);
            doc.setFont('helvetica', 'normal');
          }
          
          doc.text(`${category.category}:`, rightColumnX, currentY);
          currentY += config.lineHeight;
          doc.text(`Quantity: ${category.quantity}`, rightColumnX + 5, currentY);
          currentY += config.lineHeight;
          doc.text(`Unit Price: ₹${category.unitPrice.toFixed(2)}`, rightColumnX + 5, currentY);
          currentY += config.lineHeight;
          doc.text(`Total: ₹${category.totalPrice.toFixed(2)}`, rightColumnX + 5, currentY);
          currentY += config.lineHeight * 1.5;
        });
      }
      // Fallback to selectedGeneralTickets
      else if (ticketData.selectedGeneralTickets && ticketData.selectedGeneralTickets.length > 0) {
        ticketData.selectedGeneralTickets.forEach((ticket) => {
          if (checkPageSpace(doc, currentY, 25)) {
            currentY = addNewPageWithHeader(doc, config, rightColumnWidth);
            doc.setFontSize(config.fontSize.heading);
            doc.setFont('helvetica', 'bold');
            doc.text('Ticket Information (Continued)', rightColumnX, currentY);
            currentY += config.sectionSpacing;
            doc.setFontSize(config.fontSize.small);
            doc.setFont('helvetica', 'normal');
          }
          
          doc.text(`${ticket.categoryName}:`, rightColumnX, currentY);
          currentY += config.lineHeight;
          doc.text(`Quantity: ${ticket.quantity}`, rightColumnX + 5, currentY);
          currentY += config.lineHeight;
          doc.text(`Unit Price: ₹${ticket.basePrice.toFixed(2)}`, rightColumnX + 5, currentY);
          currentY += config.lineHeight;
          doc.text(`Total: ₹${(ticket.basePrice * ticket.quantity).toFixed(2)}`, rightColumnX + 5, currentY);
          currentY += config.lineHeight * 1.5;
        });
      }
      
      doc.setFontSize(config.fontSize.body);
    }
  } else {
    // Seat-based admission - Display in single line format "VIP Seats: A5, A4 General: B6, B7"
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
    
    // Create single line format: "VIP Seats: A5, A4 General: B6, B7"
    const categoryParts: string[] = [];
    seatsByCategory.forEach((seats, category) => {
      categoryParts.push(`${category}: ${seats.join(', ')}`);
    });
    
    const seatsDisplayText = categoryParts.join(' ');
    const maxSeatWidth = rightColumnWidth;
    currentY = addTextWithLineBreaks(doc, seatsDisplayText, rightColumnX, currentY, maxSeatWidth, config.fontSize.body);
    currentY += 4;
  }
  
  currentY += 8;
  
  // Calculate correct total seats - use backend pricing if available
  let totalSeats = ticketData.booking.quantity;
  if (backendPricing && backendPricing.actualTotalQuantity) {
    totalSeats = backendPricing.actualTotalQuantity;
  } else if (backendPricing && backendPricing.categoryBreakdown) {
    totalSeats = backendPricing.categoryBreakdown.reduce((sum, category) => sum + category.quantity, 0);
  } else if (ticketData.selectedGeneralTickets) {
    totalSeats = ticketData.selectedGeneralTickets.reduce((sum, ticket) => sum + ticket.quantity, 0);
  }
  
  doc.text('Total Seats:', rightColumnX, currentY);
  doc.text(totalSeats.toString(), rightColumnX + 30, currentY);
  
  return currentY;
};

export const generateTicketPDF = async (ticketData: TicketData & { eventOccurrenceId?: string }) => {
  console.log('Generating PDF for booking:', ticketData.booking.id);

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
  
  // Get responsive configuration
  const config = getResponsiveConfig(pageWidth, pageHeight);
  
  // Colors - properly typed as tuples
  const yellowColor: [number, number, number] = [255, 255, 0];
  const blackColor: [number, number, number] = [0, 0, 0];
  const whiteColor: [number, number, number] = [255, 255, 255];
  const grayColor: [number, number, number] = [128, 128, 128];
  
  const contentWidth = pageWidth - (config.margin * 2);
  
  // Header with yellow background
  doc.setFillColor(...yellowColor);
  doc.rect(config.margin, 15, contentWidth, config.headerHeight, 'F');
  
  // Header text - DEXOTIX.COM
  doc.setTextColor(...blackColor);
  doc.setFontSize(config.fontSize.title);
  doc.setFont('helvetica', 'bold');
  doc.text('TICKETOOZ.COM', config.margin + 5, 28);
  
  doc.setFontSize(config.fontSize.subtitle);
  doc.setFont('helvetica', 'normal');
  const ticketTypeText = isCombinedBooking ? 'Your Combined Event Tickets' : 'Your Event Ticket';
  doc.text(ticketTypeText, config.margin + 5, 38);
  
  // Main content area - Improved layout for general admission
  let currentY = 55;
  const leftColumnX = config.margin + 5;
  const rightColumnX = pageWidth * 0.6;
  const leftColumnWidth = (pageWidth * 0.55) - 10;
  const rightColumnWidth = (pageWidth * 0.35) - 10;
  
  // Event Details Section (Left Column)
  if (checkPageSpace(doc, currentY, 60)) {
    currentY = addNewPageWithHeader(doc, config, contentWidth);
  }
  
  doc.setFontSize(config.fontSize.heading);
  doc.setFont('helvetica', 'bold');
  doc.text('Event Details', leftColumnX, currentY);
  
  currentY += config.sectionSpacing;
  const detailsStartY = currentY;
  doc.setFontSize(config.fontSize.body);
  doc.setFont('helvetica', 'normal');
  
  // Event name with line wrapping and pagination
  doc.text('Event:', leftColumnX, currentY);
  currentY += config.lineHeight;
  currentY = addTextWithLineBreaks(doc, ticketData.event.name || 'Event Name', leftColumnX, currentY, leftColumnWidth, config.fontSize.body);
  currentY += config.lineHeight;
  
  // Date & Time - FIXED for recurring events to use event_time column
  if (checkPageSpace(doc, currentY, 20)) {
    currentY = addNewPageWithHeader(doc, config, contentWidth);
  }
  
  doc.text('Date & Time:', leftColumnX, currentY);
  
  // FIXED: For recurring events, use occurrence date with event_time from event table
  let eventDate: Date;
  let dateStr: string;
  let timeStr: string;
  
  if (ticketData.event.is_recurring && backendPricing?.occurrenceData) {
    // Use occurrence-specific date but event_time from event table for recurring events
    console.log('Using occurrence date with event_time for recurring event PDF:', {
      occurrenceData: backendPricing.occurrenceData,
      eventTime: backendPricing.eventTime || ticketData.event.event_time
    });
    
    // Use occurrence date
    const occurrenceDate = new Date(backendPricing.occurrenceData.occurrence_date);
    dateStr = occurrenceDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    // Use event_time from event table for recurring events
    const eventTime = backendPricing.eventTime || ticketData.event.event_time;
    if (eventTime) {
      // Parse event_time (assuming it's in HH:MM format)
      const [hours, minutes] = eventTime.split(':').map(Number);
      const timeDate = new Date();
      timeDate.setHours(hours, minutes, 0, 0);
      
      timeStr = timeDate.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      });
    } else {
      // Fallback to occurrence time if event_time is not available
      const occurrenceDateTime = `${backendPricing.occurrenceData.occurrence_date}T${backendPricing.occurrenceData.occurrence_time}`;
      eventDate = new Date(occurrenceDateTime);
      timeStr = eventDate.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      });
    }
    
    console.log('Formatted recurring event date/time for PDF:', { 
      dateStr, 
      timeStr,
      eventTime: eventTime
    });
  } else {
    // Use event's default date/time for non-recurring events
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
    
    console.log('Using default event date/time for PDF:', { 
      start_datetime: ticketData.event.start_datetime,
      dateStr, 
      timeStr,
      eventDate: eventDate.toString()
    });
  }
  
  doc.text(`${dateStr} at ${timeStr}`, leftColumnX, currentY + config.lineHeight);
  currentY += config.lineHeight * 3;
  
  // Category & Sub-category
  if (ticketData.event.category) {
    if (checkPageSpace(doc, currentY, 15)) {
      currentY = addNewPageWithHeader(doc, config, contentWidth);
    }
    doc.text('Category:', leftColumnX, currentY);
    doc.text(ticketData.event.category, leftColumnX, currentY + config.lineHeight);
    currentY += config.lineHeight * 2;
    
    if (ticketData.event.sub_category) {
      doc.text('Sub-category:', leftColumnX, currentY);
      doc.text(ticketData.event.sub_category, leftColumnX, currentY + config.lineHeight);
      currentY += config.lineHeight * 2;
    }
  }
  
  // Genre(s) - Handle both single genre and multiple genres
  const displayGenres = ticketData.event.genres && ticketData.event.genres.length > 0 
    ? ticketData.event.genres 
    : (ticketData.event.genre ? [ticketData.event.genre] : []);
  
  if (displayGenres.length > 0) {
    if (checkPageSpace(doc, currentY, 15)) {
      currentY = addNewPageWithHeader(doc, config, contentWidth);
    }
    doc.text(displayGenres.length === 1 ? 'Genre:' : 'Genres:', leftColumnX, currentY);
    const genresText = displayGenres.join(', ');
    currentY = addTextWithLineBreaks(doc, genresText, leftColumnX, currentY + config.lineHeight, leftColumnWidth, config.fontSize.body);
    currentY += config.lineHeight;
  }
  
  // Language
  if (ticketData.event.language) {
    if (checkPageSpace(doc, currentY, 15)) {
      currentY = addNewPageWithHeader(doc, config, contentWidth);
    }
    doc.text('Language:', leftColumnX, currentY);
    doc.text(ticketData.event.language, leftColumnX, currentY + config.lineHeight);
    currentY += config.lineHeight * 2;
  }
  
  // Duration
  if (ticketData.event.duration) {
    if (checkPageSpace(doc, currentY, 15)) {
      currentY = addNewPageWithHeader(doc, config, contentWidth);
    }
    doc.text('Duration:', leftColumnX, currentY);
    doc.text(`${ticketData.event.duration} hours`, leftColumnX, currentY + config.lineHeight);
    currentY += config.lineHeight * 2;
  }
  
  // Tags
  if (ticketData.event.tags && ticketData.event.tags.length > 0) {
    if (checkPageSpace(doc, currentY, 20)) {
      currentY = addNewPageWithHeader(doc, config, contentWidth);
    }
    doc.text('Tags:', leftColumnX, currentY);
    const tagsText = ticketData.event.tags.join(', ');
    currentY = addTextWithLineBreaks(doc, tagsText, leftColumnX, currentY + config.lineHeight, leftColumnWidth, config.fontSize.body);
    currentY += config.lineHeight;
  }
  
  // Artists
  if (ticketData.event.artists && ticketData.event.artists.length > 0) {
    if (checkPageSpace(doc, currentY, 20)) {
      currentY = addNewPageWithHeader(doc, config, contentWidth);
    }
    doc.text(ticketData.event.artists.length === 1 ? 'Artist:' : 'Artists:', leftColumnX, currentY);
    const artistNames = ticketData.event.artists.map(artist => artist.name).join(', ');
    currentY = addTextWithLineBreaks(doc, artistNames, leftColumnX, currentY + config.lineHeight, leftColumnWidth, config.fontSize.body);
    currentY += config.lineHeight;
  } else if (ticketData.event.artist_name) {
    if (checkPageSpace(doc, currentY, 15)) {
      currentY = addNewPageWithHeader(doc, config, contentWidth);
    }
    doc.text('Artist:', leftColumnX, currentY);
    currentY = addTextWithLineBreaks(doc, ticketData.event.artist_name, leftColumnX, currentY + config.lineHeight, leftColumnWidth, config.fontSize.body);
    currentY += config.lineHeight;
  }
  
  // Venue with line wrapping and pagination
  if (checkPageSpace(doc, currentY, 20)) {
    currentY = addNewPageWithHeader(doc, config, contentWidth);
  }
  
  doc.text('Venue:', leftColumnX, currentY);
  currentY += config.lineHeight;
  currentY = addTextWithLineBreaks(doc, ticketData.event.venue?.name || 'TBA', leftColumnX, currentY, leftColumnWidth, config.fontSize.body);
  currentY += config.lineHeight;
  
  // Address with line wrapping and pagination
  if (checkPageSpace(doc, currentY, 20)) {
    currentY = addNewPageWithHeader(doc, config, contentWidth);
  }
  
  doc.text('Address:', leftColumnX, currentY);
  currentY += config.lineHeight;
  currentY = addTextWithLineBreaks(doc, ticketData.event.venue?.address || 'TBA', leftColumnX, currentY, leftColumnWidth, config.fontSize.body);
  
  // Ticket Information Section (Right Column) - Enhanced for recurring events
  let rightColumnY = detailsStartY;
  
  // Check if we're on a new page due to left column content
  const currentPageNumber = doc.getCurrentPageInfo().pageNumber;
  if (currentPageNumber > 1) {
    // If we're on a new page, start ticket info from the top
    rightColumnY = 55;
  }
  
  if (checkPageSpace(doc, rightColumnY, 100)) {
    rightColumnY = addNewPageWithHeader(doc, config, contentWidth);
  }
  
  doc.setFontSize(config.fontSize.heading);
  doc.setFont('helvetica', 'bold');
  const ticketInfoTitle = isCombinedBooking ? 'Combined Ticket Information' : 'Ticket Information';
  doc.text(ticketInfoTitle, rightColumnX, rightColumnY);
  
  rightColumnY += config.sectionSpacing;
  doc.setFontSize(config.fontSize.body);
  doc.setFont('helvetica', 'normal');
  
  // Use the enhanced ticket breakdown display
  rightColumnY = displayTicketBreakdown(doc, ticketData, backendPricing, rightColumnX, rightColumnY, rightColumnWidth, config);
  
  // Primary Guest Section - Enhanced name handling with booking data
  currentY = Math.max(currentY, rightColumnY) + 20;
  
  if (checkPageSpace(doc, currentY, 80)) {
    currentY = addNewPageWithHeader(doc, config, contentWidth);
  }
  
  doc.setFontSize(config.fontSize.heading);
  doc.setFont('helvetica', 'bold');
  doc.text('Primary Guest', leftColumnX, currentY);
  
  currentY += config.sectionSpacing;
  const guestStartY = currentY;
  doc.setFontSize(config.fontSize.body);
  doc.setFont('helvetica', 'normal');
  
  // Enhanced customer details with proper name handling from booking data
  doc.text('Name:', leftColumnX, currentY);
  currentY += config.lineHeight;
  
  // Use the updated customer info from booking data with improved full name display
  const firstName = customerInfo.firstName || '';
  const lastName = customerInfo.lastName || '';
  const fullName = `${firstName}${lastName ? ' ' + lastName : ''}`.trim();
  
  console.log('Customer names for PDF - First:', firstName, 'Last:', lastName, 'Full:', fullName);
  
  if (fullName) {
    currentY = addTextWithLineBreaks(doc, fullName, leftColumnX, currentY, leftColumnWidth, config.fontSize.body);
  } else {
    currentY = addTextWithLineBreaks(doc, 'Guest User', leftColumnX, currentY, leftColumnWidth, config.fontSize.body);
  }
  currentY += config.lineHeight;

  if (checkPageSpace(doc, currentY, 20)) {
    currentY = addNewPageWithHeader(doc, config, contentWidth);
  }
  
  doc.text('Email:', leftColumnX, currentY);
  currentY += config.lineHeight;
  currentY = addTextWithLineBreaks(doc, customerInfo.email, leftColumnX, currentY, leftColumnWidth, config.fontSize.body);
  currentY += config.lineHeight;
  
  if (checkPageSpace(doc, currentY, 20)) {
    currentY = addNewPageWithHeader(doc, config, contentWidth);
  }
  
  doc.text('Phone:', leftColumnX, currentY);
  doc.text(customerInfo.phone, leftColumnX, currentY + config.lineHeight);
  currentY += config.lineHeight * 3;
  
  if (checkPageSpace(doc, currentY, 20)) {
    currentY = addNewPageWithHeader(doc, config, contentWidth);
  }
  
  if (isCombinedBooking && combinedBookingIds.length > 0) {
    doc.text('Combined Booking IDs:', leftColumnX, currentY);
    currentY += config.lineHeight;
    combinedBookingIds.forEach((id: string, index: number) => {
      const formattedCombinedId = generateInvoiceNumber(id, ticketData.booking.booking_date);
      const shortId = formattedCombinedId.slice(0, 20) + (formattedCombinedId.length > 20 ? '...' : '');
      currentY = addTextWithLineBreaks(doc, `${index + 1}. ${shortId}`, leftColumnX, currentY, leftColumnWidth, config.fontSize.body);
    });
  } else {
    doc.text('Booking ID:', leftColumnX, currentY);
    currentY += config.lineHeight;
    currentY = addTextWithLineBreaks(doc, formattedBookingId, leftColumnX, currentY, leftColumnWidth, config.fontSize.body);
  }
  
  // QR Code positioning - Handle pagination
  const qrX = rightColumnX;
  let qrY = guestStartY;
  
  // Check if QR code section needs a new page
  if (checkPageSpace(doc, qrY, config.qrSize + 20)) {
    qrY = addNewPageWithHeader(doc, config, contentWidth) + 20;
  }
  
  // Generate QR code with proper verification URL using formatted booking ID
  const verificationUrl = `${window.location.origin}/verify-ticket/${formattedBookingId}`;
  console.log('Generated QR verification URL:', verificationUrl);
  
  try {
    // Generate QR code as data URL with proper verification URL
    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
      width: config.qrSize * 3,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    // Add QR code image to PDF
    doc.addImage(qrCodeDataUrl, 'PNG', qrX, qrY, config.qrSize, config.qrSize);
    
    // Add QR code label
    doc.setFontSize(config.fontSize.small);
    doc.setFont('helvetica', 'normal');
    doc.text('Scan to verify ticket', qrX, qrY + config.qrSize + 5);
    
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    // Fallback: Draw rectangle with text
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1);
    doc.rect(qrX, qrY, config.qrSize, config.qrSize);
    
    doc.setFontSize(config.fontSize.small);
    doc.setFont('helvetica', 'bold');
    doc.text('QR Code', qrX + config.qrSize/2 - 12, qrY + config.qrSize/2 + 2);
    doc.text('Error', qrX + config.qrSize/2 - 8, qrY + config.qrSize/2 + 8);
  }
  
  // Payment Summary Section - Enhanced pricing display for recurring events
  currentY += 30;
  
  if (checkPageSpace(doc, currentY, 100)) {
    currentY = addNewPageWithHeader(doc, config, contentWidth);
  }
  
  doc.setFontSize(config.fontSize.heading);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Summary', leftColumnX, currentY);
  
  currentY += config.sectionSpacing;
  doc.setFontSize(config.fontSize.body);
  doc.setFont('helvetica', 'normal');
  
  if (backendPricing) {
    // Use actual backend pricing data for accurate display
    console.log('Using backend pricing data for PDF payment summary:', backendPricing);
    
    if (backendPricing.categoryBreakdown && backendPricing.categoryBreakdown.length > 0) {
      // Display category-wise pricing from backend with pagination
      backendPricing.categoryBreakdown.forEach((category) => {
        if (checkPageSpace(doc, currentY, 10)) {
          currentY = addNewPageWithHeader(doc, config, contentWidth);
          doc.setFontSize(config.fontSize.heading);
          doc.setFont('helvetica', 'bold');
          doc.text('Payment Summary (Continued)', leftColumnX, currentY);
          currentY += config.sectionSpacing;
          doc.setFontSize(config.fontSize.body);
          doc.setFont('helvetica', 'normal');
        }
        
        doc.text(`${category.category} (×${category.quantity}):`, leftColumnX, currentY);
        doc.text(`₹${category.totalPrice.toFixed(2)}`, leftColumnX + 70, currentY);
        currentY += 8;
      });
    } else {
      // General admission without specific categories
      doc.text(`Tickets (×${ticketData.booking.quantity}):`, leftColumnX, currentY);
      doc.text(`₹${backendPricing.basePrice.toFixed(2)}`, leftColumnX + 70, currentY);
      currentY += 8;
    }
    
    // Show convenience fee breakdown
    if (backendPricing.convenienceFee > 0) {
      if (checkPageSpace(doc, currentY, 25)) {
        currentY = addNewPageWithHeader(doc, config, contentWidth);
      }
      
      doc.text('Convenience Fee:', leftColumnX, currentY);
      doc.text(`₹${backendPricing.convenienceFee.toFixed(2)}`, leftColumnX + 70, currentY);
      currentY += 8;
      
      if (backendPricing.gstAmount > 0) {
        doc.text('GST (18%):', leftColumnX, currentY);
        doc.text(`₹${backendPricing.gstAmount.toFixed(2)}`, leftColumnX + 70, currentY);
        currentY += 8;
      }
    }
    
    // Total amount
    if (checkPageSpace(doc, currentY, 15)) {
      currentY = addNewPageWithHeader(doc, config, contentWidth);
    }
    doc.setFont('helvetica', 'bold');
    doc.text('Total Amount:', leftColumnX, currentY);
    doc.text(`₹${backendPricing.totalPrice.toFixed(2)}`, leftColumnX + 70, currentY);
  } else {
    // Enhanced fallback pricing display with convenience fee breakdown
    console.log('Using fallback pricing data for PDF payment summary');
    
    const totalPrice = ticketData.totalPrice;
    const convenienceFee = ticketData.convenienceFee || 0;
    const basePrice = totalPrice - convenienceFee;
    
    doc.text(`Tickets (×${ticketData.booking.quantity}):`, leftColumnX, currentY);
    doc.text(`₹${basePrice.toFixed(2)}`, leftColumnX + 70, currentY);
    currentY += 8;
    
    // Show convenience fee breakdown
    if (convenienceFee > 0) {
      const convenienceFeeBeforeGst = convenienceFee / 1.18;
      const gstAmount = convenienceFee - convenienceFeeBeforeGst;
      
      doc.text('Convenience Fee:', leftColumnX, currentY);
      doc.text(`₹${convenienceFeeBeforeGst.toFixed(2)}`, leftColumnX + 70, currentY);
      currentY += 8;
      
      if (gstAmount > 0) {
        doc.text('GST (18%):', leftColumnX, currentY);
        doc.text(`₹${gstAmount.toFixed(2)}`, leftColumnX + 70, currentY);
        currentY += 8;
      }
    }
    
    // Total amount
    doc.setFont('helvetica', 'bold');
    doc.text('Total Amount:', leftColumnX, currentY);
    doc.text(`₹${totalPrice.toFixed(2)}`, leftColumnX + 70, currentY);
  }
  
  // Important Notices Section - Handle pagination
  const noticesX = rightColumnX;
  let noticesY = Math.max(currentY - 80, guestStartY + config.qrSize + 20);
  
  if (checkPageSpace(doc, noticesY, 60)) {
    noticesY = addNewPageWithHeader(doc, config, contentWidth);
  }
  
  doc.setFontSize(config.fontSize.subtitle);
  doc.setFont('helvetica', 'bold');
  doc.text('IMPORTANT NOTICES:', noticesX, noticesY);
  
  noticesY += 8;
  doc.setFontSize(config.fontSize.small);
  doc.setFont('helvetica', 'normal');
  
  const notices = [
    '• Please bring this ticket and a valid ID',
    '  to the event',
    '• Entry is subject to security check and',
    '  event terms',
    '• No refunds or exchanges allowed',
    '• For support, contact:',
    '  support@ticketooz.com'
  ];
  
  notices.forEach(notice => {
    if (checkPageSpace(doc, noticesY, 5)) {
      noticesY = addNewPageWithHeader(doc, config, contentWidth);
    }
    doc.text(notice, noticesX, noticesY);
    noticesY += 4;
  });
  
  // Download the PDF with formatted booking ID
  doc.save(`ticket-${formattedBookingId}.pdf`);
};
