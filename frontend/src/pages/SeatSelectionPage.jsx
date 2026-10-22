import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SeatMap from "../components/booking/SeatMap";
import BookingSummary from "../components/booking/BookingSummary";
import Loading from "../components/common/Loading";
import useBooking from "../hooks/useBooking";

const API = import.meta.env.VITE_API_URL;

export default function SeatSelectionPage() {
  const { showtimeId } = useParams();
  const navigate = useNavigate();
  const { booking, updateBooking } = useBooking();
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadSeats() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `${API}/Seats.php?showtimeId=${encodeURIComponent(showtimeId)}`,
          { signal: controller.signal }
        );
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || "Unable to load seats.");

        setSeats(data.seats || []);

        // Use the server's showtime details, not whatever was left in state
        // (which is empty after a refresh and wrong after switching showtimes).
        const show = data.showtime;
        updateBooking({
          showtime: {
            ShowtimeID: Number(show.ShowtimeID),
            MovieID: Number(show.MovieID),
            StartTime: show.StartTime,
            TicketPrice: show.TicketPrice,
            HallName: show.HallName,
          },
          movie: {
            ...(Number(booking.movie?.MovieID) === Number(show.MovieID)
              ? booking.movie
              : {}),
            MovieID: Number(show.MovieID),
            Title: show.Title,
          },
          seats: [],
        });
      } catch (e) {
        if (e.name !== "AbortError") setError(e.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadSeats();
    return () => controller.abort();
  }, [showtimeId]);

  const selectedIds = booking.seats.map((seat) => Number(seat.SeatID));

  function toggleSeat(seat) {
    const id = Number(seat.SeatID);

    if (Number(seat.IsBooked) === 1) return;

    if (selectedIds.includes(id)) {
      updateBooking({
        seats: booking.seats.filter((item) => Number(item.SeatID) !== id),
      });
      return;
    }

    if (booking.seats.length >= 10) {
      setError("You can select a maximum of 10 seats.");
      return;
    }

    setError("");
    updateBooking({
      seats: [
        ...booking.seats,
        { ...seat, price: Number(booking.showtime?.TicketPrice || 0) },
      ],
    });
  }

  if (loading) return <Loading />;

  if (error && seats.length === 0) {
    return (
      <section className="container page-section">
        <h1>Select your seats</h1>
        <p className="error-message" role="alert">{error}</p>
        <button type="button" className="btn" onClick={() => navigate(-1)}>
          Go back
        </button>
      </section>
    );
  }

  return (
    <section className="container page-section">
      <h1>Select your seats</h1>
      {error && <p className="error-message">{error}</p>}

      <div className="seat-selection-layout">
        <SeatMap
          seats={seats}
          selectedIds={selectedIds}
          onToggle={toggleSeat}
        />

        <BookingSummary
          seats={booking.seats}
          ticketPrice={booking.showtime?.TicketPrice || 0}
          onContinue={() => navigate("/concessions")}
        />
      </div>
    </section>
  );
}