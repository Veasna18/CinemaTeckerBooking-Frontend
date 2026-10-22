export default function BookingSummary({
  seats,
  ticketPrice,
  onContinue,
  disabled = false,
}) {
  const total = seats.length * Number(ticketPrice);

  return (
    <aside className="booking-summary">
      <h3>Your booking</h3>

      <div className="summary-line">
        <span>Tickets ({seats.length})</span>
        <strong>${total.toFixed(2)}</strong>
      </div>

      <div className="summary-line">
        <span>Selected seats</span>
        <strong>
          {seats.length
            ? seats.map((s) => `${s.RowLabel}${s.SeatNumber}`).join(", ")
            : "None"}
        </strong>
      </div>

      <div className="summary-total">
        <span>Total</span>
        <strong>${total.toFixed(2)}</strong>
      </div>

      <button
        className="btn btn-primary btn-block"
        disabled={disabled || seats.length === 0}
        onClick={onContinue}
      >
        Continue to checkout
      </button>
    </aside>
  );
}