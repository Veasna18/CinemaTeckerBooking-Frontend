import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useBooking from "../hooks/useBooking";

const API = import.meta.env.VITE_API_URL;

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { booking, updateBooking, ticketTotal, concessionTotal, total } = useBooking();
  const [name, setName] = useState(booking.customerName || "");
  const [email, setEmail] = useState(booking.customerEmail || "");
  const [phone, setPhone] = useState(booking.customerPhone || "");
  const [paymentMethod, setPaymentMethod] = useState("Pay at counter");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (!booking.showtime?.ShowtimeID || booking.seats.length === 0) {
      setError("Please select a showtime and seats first.");
      return;
    }
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanPhone = phone.trim();
    if (!cleanName || cleanName.length > 120 || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setError("Please enter a valid name and email address.");
      return;
    }
    if (!/^[0-9+\s().-]{7,30}$/.test(cleanPhone)) {
      setError("Please enter a valid phone number.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API}/Booking.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: cleanName,
          customerEmail: cleanEmail,
          customerPhone: cleanPhone,
          paymentMethod,
          showtimeId: Number(booking.showtime.ShowtimeID),
          seatIds: booking.seats.map((seat) => Number(seat.SeatID)),
          concessions: booking.concessions.map((item) => ({
            concessionId: Number(item.ConcessionID),
            quantity: Number(item.quantity),
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Booking failed.");
      updateBooking({ customerName: cleanName, customerEmail: cleanEmail, customerPhone: cleanPhone, paymentMethod, confirmation: data.booking });
      navigate("/success");
    } catch (e) {
      setError(e instanceof TypeError ? "Unable to connect to the booking server. Please try again." : e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="container page-section checkout-page">
      <div>
        <p className="eyebrow">ALMOST THERE</p>
        <h1>Checkout</h1>
        <p>Confirm your contact details and payment option. Payment is currently recorded as a reservation choice.</p>
        <form className="checkout-form" onSubmit={submit}>
          <label htmlFor="customerName">Full name</label>
          <input id="customerName" type="text" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
          <label htmlFor="customerEmail">Email address</label>
          <input id="customerEmail" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <label htmlFor="customerPhone">Phone number</label>
          <input id="customerPhone" type="tel" autoComplete="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +855 12 345 678" />
          <label htmlFor="paymentMethod">Payment method</label>
          <select id="paymentMethod" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            <option>Pay at counter</option>
            <option>Cash</option>
            <option>Card (at counter)</option>
            <option>KHQR (at counter)</option>
          </select>
          {error && <p className="error-message" role="alert">{error}</p>}
          <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>{submitting ? "Processing..." : "Confirm booking"}</button>
        </form>
      </div>
      <aside className="booking-summary">
        <h3>Order summary</h3>
        <p>Movie: {booking.movie?.Title || "Selected movie"}</p>
        <p>Showtime: {booking.showtime?.StartTime ? new Date(booking.showtime.StartTime).toLocaleString() : "Selected showtime"}</p>
        <p>Tickets: {booking.seats.length}</p>
        <p>Seats: {booking.seats.map((seat) => `${seat.RowLabel}${seat.SeatNumber}`).join(", ")}</p>
        <p>Tickets total: ${ticketTotal.toFixed(2)}</p>
        <p>Snacks & drinks: ${concessionTotal.toFixed(2)}</p>
        {booking.concessions.length > 0 && <ul>{booking.concessions.map((item) => <li key={item.ConcessionID}>{item.Name} × {item.quantity}</li>)}</ul>}
        <div className="summary-total"><span>Total</span><strong>${total.toFixed(2)}</strong></div>
      </aside>
    </section>
  );
}
