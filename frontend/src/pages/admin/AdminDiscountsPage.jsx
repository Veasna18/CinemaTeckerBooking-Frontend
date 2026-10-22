
import { useCallback, useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL;

const emptyForm = {
  code: "",
  description: "",
  discountType: "Percentage",
  discountValue: "10",
  startDate: "",
  endDate: "",
  maxUses: "",
  isActive: true,
};

function dateValue(value) {
  return value ? String(value).replace(" ", "T").slice(0, 16) : "";
}

export default function AdminDiscountsPage() {
  const [discounts, setDiscounts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const api = useCallback(async (options = {}) => {
    const response = await fetch(`${API}/AdminDiscounts.php`, {
      credentials: "include",
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok || data.success === false) {
      throw new Error(data.error || "Discount request failed.");
    }

    return data;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await api();
      setDiscounts(data.discounts || []);
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
    setEditingId(item.DiscountID);
    setForm({
      code: item.Code || "",
      description: item.Description || "",
      discountType: item.DiscountType,
      discountValue: String(item.DiscountValue),
      startDate: dateValue(item.StartDate),
      endDate: dateValue(item.EndDate),
      maxUses: item.MaxUses == null ? "" : String(item.MaxUses),
      isActive: Boolean(item.IsActive),
    });
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function save(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const value = Number(form.discountValue);
    const maxUses = form.maxUses === "" ? null : Number(form.maxUses);

    if (
      !form.code.trim() ||
      !form.startDate ||
      !form.endDate ||
      new Date(form.endDate) <= new Date(form.startDate) ||
      !Number.isFinite(value) ||
      value <= 0 ||
      (form.discountType === "Percentage" && value > 100) ||
      (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 0))
    ) {
      setError("Check the code, discount value, dates, and usage limit.");
      return;
    }

    setSaving(true);

    try {
      const data = await api({
        method: "POST",
        body: JSON.stringify({
          action: editingId ? "update" : "create",
          discountId: editingId,
          code: form.code.trim().toUpperCase(),
          description: form.description.trim(),
          discountType: form.discountType,
          discountValue: value,
          startDate: form.startDate,
          endDate: form.endDate,
          maxUses,
          isActive: form.isActive,
        }),
      });

      setMessage(data.message || "Discount saved.");
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
          discountId: Number(item.DiscountID),
          isActive: !Boolean(item.IsActive),
        }),
      });

      setMessage(data.message || "Discount status updated.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="admin-page">
      <p className="eyebrow">PROMOTIONS</p>
      <h1>Discounts</h1>
      <p>Create promo codes for eligible bookings.</p>

      {error && <p className="error-message" role="alert">{error}</p>}
      {message && <p className="admin-success" role="status">{message}</p>}

      <form className="admin-form" onSubmit={save}>
        <h2>{editingId ? "Edit discount" : "Create discount"}</h2>

        <div className="admin-form-grid">
          <label>
            Promo code *
            <input
              required
              maxLength={40}
              value={form.code}
              onChange={(e) => change("code", e.target.value.toUpperCase())}
              placeholder="MOVIE10"
            />
          </label>

          <label>
            Discount type *
            <select
              value={form.discountType}
              onChange={(e) => change("discountType", e.target.value)}
            >
              <option value="Percentage">Percentage (%)</option>
              <option value="Fixed">Fixed amount ($)</option>
            </select>
          </label>

          <label>
            Discount value *
            <input
              type="number"
              min="0.01"
              step="0.01"
              max={form.discountType === "Percentage" ? 100 : 100000}
              required
              value={form.discountValue}
              onChange={(e) => change("discountValue", e.target.value)}
            />
          </label>

          <label>
            Maximum uses
            <input
              type="number"
              min="0"
              step="1"
              value={form.maxUses}
              onChange={(e) => change("maxUses", e.target.value)}
              placeholder="Unlimited"
            />
          </label>

          <label>
            Start date and time *
            <input
              type="datetime-local"
              required
              value={form.startDate}
              onChange={(e) => change("startDate", e.target.value)}
            />
          </label>

          <label>
            End date and time *
            <input
              type="datetime-local"
              required
              value={form.endDate}
              onChange={(e) => change("endDate", e.target.value)}
            />
          </label>

          <label className="admin-full-width">
            Description
            <textarea
              rows={3}
              maxLength={250}
              value={form.description}
              onChange={(e) => change("description", e.target.value)}
            />
          </label>

          <label className="admin-checkbox">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => change("isActive", e.target.checked)}
            />
            Discount active
          </label>
        </div>

        <div className="admin-form-actions">
          <button className="btn btn-primary" disabled={saving}>
            {saving ? "Saving..." : editingId ? "Save changes" : "Create discount"}
          </button>
          {editingId && (
            <button type="button" className="btn" onClick={reset}>
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <section className="admin-table-section">
        <h2>Promotion codes</h2>

        {loading ? <p>Loading discounts...</p> : (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th>Validity</th>
                  <th>Usage</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {discounts.map((item) => (
                  <tr key={item.DiscountID}>
                    <td>
                      <strong>{item.Code}</strong>
                      <small>{item.Description}</small>
                    </td>
                    <td>
                      {item.DiscountType === "Percentage"
                        ? `${item.DiscountValue}%`
                        : `$${Number(item.DiscountValue).toFixed(2)}`}
                    </td>
                    <td>
                      <small>From {String(item.StartDate).slice(0, 16)}</small>
                      <small>To {String(item.EndDate).slice(0, 16)}</small>
                    </td>
                    <td>
                      {item.UsedCount} / {item.MaxUses ?? "∞"}
                    </td>
                    <td>{item.IsActive ? "Active" : "Inactive"}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button type="button" onClick={() => edit(item)}>
                          Edit
                        </button>
                        <button type="button" onClick={() => toggle(item)}>
                          {item.IsActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!discounts.length && (
                  <tr><td colSpan={6}>No discounts created yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
