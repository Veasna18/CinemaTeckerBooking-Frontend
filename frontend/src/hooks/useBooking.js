import { useBookingContext } from "../context/BookingContext";

export default function useBooking() {
  const { booking, updateBooking, resetBooking } = useBookingContext();

  const ticketTotal = booking.seats.reduce(
    (sum, seat) => sum + Number(seat.price || 0),
    0
  );

  const concessionTotal = booking.concessions.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.quantity),
    0
  );

  return {
    booking,
    updateBooking,
    resetBooking,
    ticketTotal,
    concessionTotal,
    total: ticketTotal + concessionTotal,
  };
}