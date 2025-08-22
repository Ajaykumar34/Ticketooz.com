
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Calendar, MapPin, User, Phone, Mail, Receipt } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateInvoiceNumber, formatInvoiceNumber } from '@/utils/invoiceUtils';

interface Booking {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  total_price: number;
  quantity: number;
  status: string;
  booking_date: string;
  convenience_fee: number;
  event: {
    name: string;
    start_datetime: string;
    venue: {
      name: string;
      city: string;
    };
  };
  seat_numbers: Array<{
    seat_number: string;
    seat_category: string;
    price: number;
  }>;
}

const OrderDetailsModule = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    filterBookings();
  }, [bookings, searchTerm, selectedStatus]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          event:events (
            name,
            start_datetime,
            venue:venues (
              name,
              city
            )
          )
        `)
        .order('booking_date', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  const filterBookings = () => {
    let filtered = bookings;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(booking => 
        booking.customer_name?.toLowerCase().includes(term) ||
        booking.customer_email?.toLowerCase().includes(term) ||
        booking.id.toLowerCase().includes(term) ||
        generateInvoiceNumber(booking.id, booking.booking_date).toLowerCase().includes(term)
      );
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(booking => booking.status === selectedStatus);
    }

    setFilteredBookings(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed': return 'bg-green-100 text-green-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Order Details Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by customer name, email, booking ID, or invoice number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Pending">Pending</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Invoice #</th>
                  <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Booking ID</th>
                  <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Customer</th>
                  <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Event</th>
                  <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Venue</th>
                  <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Tickets</th>
                  <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Total</th>
                  <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Status</th>
                  <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-3">
                      <div className="font-mono text-sm font-semibold text-blue-600">
                        {formatInvoiceNumber(generateInvoiceNumber(booking.id, booking.booking_date))}
                      </div>
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <div className="font-mono text-sm text-gray-600">
                        {booking.id.slice(0, 8)}...
                      </div>
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{booking.customer_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="h-4 w-4" />
                          <span>{booking.customer_email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="h-4 w-4" />
                          <span>{booking.customer_phone}</span>
                        </div>
                      </div>
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <div className="space-y-1">
                        <div className="font-medium">{booking.event?.name}</div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(booking.event?.start_datetime).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="font-medium">{booking.event?.venue?.name}</div>
                          <div className="text-sm text-gray-600">{booking.event?.venue?.city}</div>
                        </div>
                      </div>
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <div className="space-y-1">
                        <div className="font-medium">Qty: {booking.quantity}</div>
                        {booking.seat_numbers && booking.seat_numbers.length > 0 && (
                          <div className="text-sm text-gray-600">
                            {booking.seat_numbers.map((seat, index) => (
                              <div key={index}>
                                {seat.seat_category}: {seat.seat_number}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <div className="space-y-1">
                        <div className="font-semibold">₹{booking.total_price}</div>
                        {booking.convenience_fee > 0 && (
                          <div className="text-sm text-gray-600">
                            Conv. Fee: ₹{booking.convenience_fee}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <Badge className={getStatusColor(booking.status)}>
                        {booking.status}
                      </Badge>
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <div className="text-sm">
                        {new Date(booking.booking_date).toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredBookings.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No bookings found matching your criteria
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderDetailsModule;
