
import { useCallback, useEffect, useState } from "react";
import { normalizeUploadPath } from "../../utils/media";

const API = import.meta.env.VITE_API_URL;

function imageUrl(value) {
  return normalizeUploadPath(value);
}

const emptyForm = {
  name: "",
  description: "",
  price: "4.50",
  imageURL: "",
  isAvailable: true,
};

export default function AdminConcessionsPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const api = useCallback(async (options = {}) => {
    const response = await fetch(`${API}/AdminConcessions.php`, {
      credentials: "include",
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok || data.success === false) {
      throw new Error(data.error || "Concession request failed.");
    }

    return data;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await api();
      setItems(data.concessions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  function change(key, value) {
    setForm((old) => ({ ...old, [key]: value }));
  }

  function edit(item) {
    setEditingId(item.ConcessionID);
    setForm({
      name: item.Name || "",
      description: item.Description || "",
      price: String(item.Price),
      imageURL: imageUrl(item.ImageURL),
      isAvailable: Boolean(item.IsAvailable),
    });
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function uploadImage(file) {
    if (!file) return;
    setError("");
    setMessage("Uploading product image...");
    const body = new FormData();
    body.append("image", file);

    try {
      const response = await fetch(`${API}/UploadConcessionImage.php`, {
        method: "POST",
        credentials: "include",
        body,
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to upload product image.");
      }
      setForm((old) => ({ ...old, imageURL: data.url }));
      setMessage("Image uploaded. Save the product to keep the change.");
    } catch (err) {
      setMessage("");
      setError(err.message);
    }
  }

  async function save(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const price = Number(form.price);

    if (
      !form.name.trim() ||
      form.name.trim().length > 100 ||
      !Number.isFinite(price) ||
      price < 0 ||
      price > 100000
    ) {
      setError("Enter a valid product name and price.");
      return;
    }

    setSaving(true);

    try {
      const data = await api({
        method: "POST",
        body: JSON.stringify({
          action: editingId ? "update" : "create",
          concessionId: editingId,
          name: form.name.trim(),
          description: form.description.trim(),
          price,
          imageURL: form.imageURL.trim(),
          isAvailable: form.isAvailable,
        }),
      });

      setMessage(data.message || "Product saved.");
      reset();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggle(item) {
    setError("");
    setMessage("");

    try {
      const data = await api({
        method: "POST",
        body: JSON.stringify({
          action: "toggle",
          concessionId: Number(item.ConcessionID),
          isAvailable: !Boolean(item.IsAvailable),
        }),
      });

      setMessage(data.message || "Availability updated.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="admin-page">
      <p className="eyebrow">FOOD AND BEVERAGE</p>
      <h1>Concessions</h1>
      <p>Manage cinema snacks, drinks, combo meals and pricing.</p>

      {error && <p className="error-message" role="alert">{error}</p>}
      {message && <p className="admin-success" role="status">{message}</p>}

      <form className="admin-form" onSubmit={save}>
        <h2>{editingId ? "Edit product" : "Add product"}</h2>

        <div className="admin-form-grid">
          <label>
            Product name *
            <input
              required
              maxLength={100}
              value={form.name}
              onChange={(e) => change("name", e.target.value)}
              placeholder="Large Popcorn"
            />
          </label>

          <label>
            Price ($) *
            <input
              type="number"
              min="0"
              max="100000"
              step="0.01"
              required
              value={form.price}
              onChange={(e) => change("price", e.target.value)}
            />
          </label>

          <label className="admin-full-width">
            Product image
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => uploadImage(e.target.files?.[0])}
              disabled={saving}
            />
            <small className="admin-field-help">JPG, PNG, WEBP or GIF, max 5 MB</small>
            {form.imageURL && (
              <img className="admin-product-preview" src={form.imageURL} alt="Product preview" />
            )}
          </label>

          <label className="admin-full-width">
            Description
            <textarea
              rows={3}
              maxLength={300}
              value={form.description}
              onChange={(e) => change("description", e.target.value)}
              placeholder="Describe the product..."
            />
          </label>

          <label className="admin-checkbox">
            <input
              type="checkbox"
              checked={form.isAvailable}
              onChange={(e) => change("isAvailable", e.target.checked)}
            />
            Available for purchase
          </label>
        </div>

        <div className="admin-form-actions">
          <button className="btn btn-primary" disabled={saving}>
            {saving ? "Saving..." : editingId ? "Save changes" : "Add product"}
          </button>

          {editingId && (
            <button type="button" className="btn" onClick={reset}>
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <section className="admin-table-section">
        <h2>Product catalogue</h2>

        {loading ? <p>Loading concessions...</p> : (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Availability</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.ConcessionID}>
                    <td className="admin-product-cell">
                      {item.ImageURL ? (
                        <img className="admin-table-thumb product-thumb" src={imageUrl(item.ImageURL)} alt="" />
                      ) : (
                        <span className="admin-table-thumb-placeholder">🍿</span>
                      )}
                      <div>
                      <strong>{item.Name}</strong>
                      <small>{item.Description}</small>
                      </div>
                    </td>
                    <td>${Number(item.Price).toFixed(2)}</td>
                    <td>{item.IsAvailable ? "Available" : "Unavailable"}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button type="button" onClick={() => edit(item)}>
                          Edit
                        </button>
                        <button type="button" onClick={() => toggle(item)}>
                          {item.IsAvailable ? "Disable" : "Enable"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!items.length && (
                  <tr><td colSpan={4}>No concession products found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
