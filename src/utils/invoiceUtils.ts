
export const generateInvoiceNumber = (bookingId: string, bookingDate: string): string => {
  // Extract date components
  const date = new Date(bookingDate);
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  
  // Extract booking ID suffix (last 6 characters)
  const bookingIdSuffix = bookingId.slice(-6).toUpperCase();
  
  // Format: INV-YYMMDD-XXXXXX
  return `INV-${year}${month}${day}-${bookingIdSuffix}`;
};

export const formatInvoiceNumber = (invoiceNumber: string): string => {
  if (!invoiceNumber) return 'N/A';
  return invoiceNumber;
};
