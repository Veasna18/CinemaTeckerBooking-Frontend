import { useMemo } from "react";
import SeatRow from "./SeatRow";

export default function SeatMap({ seats, selectedIds, onToggle }) {
  const rows = useMemo(() => {
    const grouped = {};

    seats.forEach((seat) => {
      const label = seat.RowLabel;
      if (!grouped[label]) grouped[label] = [];
      grouped[label].push(seat);
    });

    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [seats]);

  return (
    <div className="seat-map">
      <div className="screen">
        <span>SCREEN</span>
      </div>

      <div className="seat-legend">
        <span><i className="legend-seat available" /> Available</span>
        <span><i className="legend-seat selected" /> Selected</span>
        <span><i className="legend-seat booked" /> Booked</span>
        <span><i className="legend-seat premium" /> Premium</span>
      </div>

      <div className="seat-rows">
        {rows.map(([label, rowSeats]) => (
          <SeatRow
            key={label}
            rowLabel={label}
            seats={rowSeats}
            selectedIds={selectedIds}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  );
}