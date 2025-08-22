
export const generateInvoiceNumber = (bookingId: string, createdAt: string): string => {
  // Extract date components from createdAt
  const date = new Date(createdAt);
  const year = date.getFullYear().toString().slice(-2); // Last 2 digits of year
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  
  // Extract last 6 characters of booking ID for uniqueness
  const bookingIdSuffix = bookingId.slice(-6).toUpperCase();
  
  return `INV-${year}${month}${day}-${bookingIdSuffix}`;
};
