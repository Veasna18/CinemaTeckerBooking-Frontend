export default function SeatRow({
  rowLabel,
  seats,
  selectedIds,
  onToggle,
}) {
  return (
    <div className="seat-row">
      <span className="row-label">{rowLabel}</span>

      {seats.map((seat) => {
        const selected = selectedIds.includes(Number(seat.SeatID));
        const booked = Number(seat.IsBooked) === 1;

        return (
          <button
            key={seat.SeatID}
            type="button"
            disabled={booked}
            title={`${seat.RowLabel}${seat.SeatNumber}${booked ? " - Booked" : ""}`}
            aria-label={`Seat ${seat.RowLabel}${seat.SeatNumber}${booked ? ", booked" : selected ? ", selected" : ", available"}`}
            aria-pressed={selected}
            className={[
              "seat",
              booked ? "seat-booked" : "",
              selected ? "seat-selected" : "",
              seat.SeatType === "Premium" ? "seat-premium" : "",
            ].filter(Boolean).join(" ")}
            onClick={() => onToggle(seat)}
          >
            {seat.SeatNumber}
          </button>
        );
      })}

      <span className="row-label">{rowLabel}</span>
    </div>
  );
}