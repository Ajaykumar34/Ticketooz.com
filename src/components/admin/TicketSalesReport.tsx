
// TicketSalesReport is no longer available because all event/venue/ticket tables are dropped.

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

const TicketSalesReport = () => (
  <div className="w-full h-[60vh] flex flex-col items-center justify-center text-center">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <AlertTriangle className="w-6 h-6 text-yellow-400" />
          <span>Ticket Sales Report Unavailable</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-lg text-gray-700 mb-4">
          Ticket sales reporting is disabled.<br />
          All event, venue, and booking/ticket tables were removed from the database so this dashboard is no longer supported.
        </p>
      </CardContent>
    </Card>
  </div>
);

export default TicketSalesReport;
