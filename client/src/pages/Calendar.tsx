import { useState } from "react";
import { useCheckouts, useContracts } from "@/hooks/use-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { ChevronLeft, ChevronRight, Loader2, FileText } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function Calendar() {
  const { data: checkouts = [], isLoading: checkoutsLoading } = useCheckouts();
  const { data: contracts = [], isLoading: contractsLoading } = useContracts();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startDayOfWeek = monthStart.getDay();
  const paddingDays = Array(startDayOfWeek).fill(null);

  const getDueCheckoutsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return checkouts.filter(c => c.due_date === dateStr && c.status !== 'returned');
  };

  const getCheckoutStartsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return checkouts.filter(c => c.checkout_date === dateStr);
  };

  const getContractsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return contracts.filter(c => {
      if (!c.signed_at) return false;
      const signedDate = format(new Date(c.signed_at), 'yyyy-MM-dd');
      return signedDate === dateStr;
    });
  };

  const isLoading = checkoutsLoading || contractsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-primary">Due Date Calendar</h1>
        <p className="text-muted-foreground">View sample due dates at a glance.</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              data-testid="button-prev-month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-lg">
              {format(currentMonth, 'MMMM yyyy')}
            </CardTitle>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              data-testid="button-next-month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
            
            {paddingDays.map((_, i) => (
              <div key={`pad-${i}`} className="aspect-square" />
            ))}
            
            {daysInMonth.map(day => {
              const dueCheckouts = getDueCheckoutsForDay(day);
              const checkoutStarts = getCheckoutStartsForDay(day);
              const dayContracts = getContractsForDay(day);
              const isToday = isSameDay(day, new Date());
              const hasOverdue = dueCheckouts.some(c => c.status === 'overdue');
              const hasEvents = dueCheckouts.length > 0 || checkoutStarts.length > 0 || dayContracts.length > 0;
              
              return (
                <Popover key={day.toISOString()}>
                  <PopoverTrigger asChild>
                    <button
                      className={`
                        aspect-square p-1 rounded-md text-sm relative
                        hover:bg-muted transition-colors
                        ${isToday ? 'bg-primary/10 font-bold' : ''}
                        ${hasEvents ? 'cursor-pointer' : ''}
                      `}
                      data-testid={`calendar-day-${format(day, 'yyyy-MM-dd')}`}
                    >
                      <span className={isToday ? 'text-primary' : ''}>
                        {format(day, 'd')}
                      </span>
                      {hasEvents && (
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                          {dayContracts.slice(0, 2).map((_, i) => (
                            <div key={`contract-${i}`} className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          ))}
                          {checkoutStarts.slice(0, 2).map((_, i) => (
                            <div key={`start-${i}`} className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          ))}
                          {dueCheckouts.slice(0, 2).map((c, i) => (
                            <div
                              key={`due-${i}`}
                              className={`w-1.5 h-1.5 rounded-full ${
                                c.status === 'overdue' ? 'bg-red-500' : 'bg-amber-500'
                              }`}
                            />
                          ))}
                          {(dayContracts.length + checkoutStarts.length + dueCheckouts.length) > 4 && (
                            <span className="text-[10px] text-muted-foreground">+{dayContracts.length + checkoutStarts.length + dueCheckouts.length - 4}</span>
                          )}
                        </div>
                      )}
                    </button>
                  </PopoverTrigger>
                  {hasEvents && (
                    <PopoverContent className="w-72 p-2" align="center">
                      <div className="space-y-2">
                        {dayContracts.length > 0 && (
                          <>
                            <p className="font-medium text-sm border-b pb-1 text-green-600 flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              Contracts Signed {format(day, 'MMM d, yyyy')}
                            </p>
                            {dayContracts.map(contract => (
                              <div key={`contract-${contract.id}`} className="flex items-start justify-between text-sm p-2 bg-green-50 rounded border-l-2 border-green-500" data-testid={`popover-contract-${contract.id}`}>
                                <div>
                                  <p className="font-medium">{contract.customer_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {contract.contract_type === 'custom_cabinetry' ? 'Custom Cabinetry' : 'Home Improvement'}
                                  </p>
                                </div>
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded font-medium">Signed</span>
                              </div>
                            ))}
                          </>
                        )}
                        {checkoutStarts.length > 0 && (
                          <>
                            <p className="font-medium text-sm border-b pb-1 text-blue-600">
                              Checked Out {format(day, 'MMM d, yyyy')}
                            </p>
                            {checkoutStarts.map(checkout => (
                              <div key={`start-${checkout.id}`} className="flex items-start justify-between text-sm p-2 bg-blue-50 rounded border-l-2 border-blue-500" data-testid={`popover-checkout-start-${checkout.id}`}>
                                <div>
                                  <p className="font-medium">{checkout.customer.name}</p>
                                  <p className="text-xs text-muted-foreground">{checkout.item.name}</p>
                                </div>
                                <StatusBadge status={checkout.status as 'checked_out' | 'overdue' | 'returned'} />
                              </div>
                            ))}
                          </>
                        )}
                        {dueCheckouts.length > 0 && (
                          <>
                            <p className="font-medium text-sm border-b pb-1">
                              Due {format(day, 'MMM d, yyyy')}
                            </p>
                            {dueCheckouts.map(checkout => (
                              <div key={`due-${checkout.id}`} className="flex items-start justify-between text-sm p-2 bg-muted rounded" data-testid={`popover-checkout-${checkout.id}`}>
                                <div>
                                  <p className="font-medium">{checkout.customer.name}</p>
                                  <p className="text-xs text-muted-foreground">{checkout.item.name}</p>
                                </div>
                                <StatusBadge status={checkout.status as 'checked_out' | 'overdue' | 'returned'} />
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    </PopoverContent>
                  )}
                </Popover>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
