import { Link, Navigate } from "react-router-dom";
import useBooking from "../hooks/useBooking";

export default function SuccessPage() {
  const { booking, resetBooking } = useBooking();
  const confirmation = booking.confirmation;

  if (!confirmation) return <Navigate to="/" replace />;

  return (
    <section className="container success-page">
      <div className="success-icon">✓</div>
      <p className="eyebrow">BOOKING COMPLETE</p>
      <h1>Your movie night is booked!</h1>
      <p>A booking record has been created successfully.</p>

      <div className="confirmation-card">
        <p>Booking reference</p>
        <h2>{confirmation.bookingCode}</h2>
        <div className="summary-line">
          <span>Customer</span>
          <strong>{confirmation.customerName}</strong>
        </div>
        <div className="summary-line">
          <span>Email</span>
          <strong>{confirmation.customerEmail}</strong>
        </div>
        <div className="summary-line">
          <span>Seats</span>
          <strong>
            {booking.seats.map((s) => `${s.RowLabel}${s.SeatNumber}`).join(", ")}
          </strong>
        </div>
        <div className="summary-total">
          <span>Total</span>
          <strong>${Number(confirmation.totalAmount).toFixed(2)}</strong>
        </div>
      </div>

      <Link
        to="/"
        className="btn btn-primary"
        onClick={() => resetBooking()}
      >
        Back to movies
      </Link>
    </section>
  );
}