import { createContext, useContext, useState } from "react";

const BookingContext = createContext(null);

export function BookingProvider({ children }) {
  const [booking, setBooking] = useState({
    movie: null,
    showtime: null,
    seats: [],
    concessions: [],
    customerName: "",
    customerEmail: "",
    confirmation: null,
  });

  const updateBooking = (updates) => {
    setBooking((previous) => ({ ...previous, ...updates }));
  };

  const resetBooking = () => {
    setBooking({
      movie: null,
      showtime: null,
      seats: [],
      concessions: [],
      customerName: "",
      customerEmail: "",
      confirmation: null,
    });
  };

  return (
    <BookingContext.Provider value={{ booking, updateBooking, resetBooking }}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBookingContext() {
  const context = useContext(BookingContext);

  if (!context) {
    throw new Error("useBookingContext must be used inside BookingProvider");
  }

  return context;
}