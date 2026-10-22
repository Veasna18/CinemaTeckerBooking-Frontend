import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useBooking from "../hooks/useBooking";
import { mediaUrl } from "../utils/media";

const API = import.meta.env.VITE_API_URL;

export default function ConcessionsPage() {
  const navigate = useNavigate();
  const { booking, updateBooking, total } = useBooking();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API}/Concessions.php`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load snacks.");
        setItems(data.concessions || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function changeQuantity(item, delta) {
    const id = Number(item.ConcessionID);
    const current = booking.concessions.find((x) => Number(x.ConcessionID) === id);
    const quantity = Math.max(0, (current?.quantity || 0) + delta);

    updateBooking({
      concessions: [
        ...booking.concessions.filter((x) => Number(x.ConcessionID) !== id),
        ...(quantity > 0 ? [{ ...item, quantity, price: Number(item.Price) }] : []),
      ],
    });
  }

  return (
    <section className="container page-section">
      <p className="eyebrow">MAKE IT A MOVIE NIGHT</p>
      <h1>Snacks & drinks</h1>
      <p>Add popcorn, drinks, and combo meals before checkout. This step is optional.</p>

      {error && <p className="error-message" role="alert">{error}</p>}
      {loading ? <p>Loading snacks and drinks...</p> : (
        <div className="concession-grid">
          {items.map((item) => {
            const quantity = booking.concessions.find(
              (x) => Number(x.ConcessionID) === Number(item.ConcessionID)
            )?.quantity || 0;
            return (
              <article className="concession-card" key={item.ConcessionID}>
                {item.ImageURL ? (
                  <img className="concession-image" src={mediaUrl(item.ImageURL)} alt={item.Name} />
                ) : <div className="concession-emoji">🍿</div>}
                <h3>{item.Name}</h3>
                <p>{item.Description}</p>
                <strong>${Number(item.Price).toFixed(2)}</strong>
                <div className="quantity-control">
                  <button type="button" onClick={() => changeQuantity(item, -1)}>-</button>
                  <span>{quantity}</span>
                  <button type="button" onClick={() => changeQuantity(item, 1)}>+</button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="page-actions">
        <button
          className="btn"
          type="button"
          onClick={() => {
            updateBooking({ concessions: [] });
            navigate("/checkout");
          }}
        >
          Skip snacks
        </button>
        <button className="btn btn-primary" type="button" onClick={() => navigate("/checkout")}>
          Continue to checkout · ${total.toFixed(2)}
        </button>
      </div>
    </section>
  );
}
