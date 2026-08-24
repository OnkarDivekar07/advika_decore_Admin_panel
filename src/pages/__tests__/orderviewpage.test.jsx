import React from "react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OrderViewPage from "../orderviewpage";

jest.mock("../../api/apiClient", () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));

// eslint-disable-next-line import/first
import apiClient from "../../api/apiClient";

const ORDER_ID = "507f1f77bcf86cd799439099";

const buildOrder = (overrides = {}) => ({
  id: ORDER_ID,
  total: 2099,
  subtotal: 1900,
  deliveryCharge: 199,
  discount: 0,
  couponCode: null,
  status: "confirmed",
  paymentStatus: "paid",
  payment_order_id: "order_rzp_abc123",
  payment_id: "pay_rzp_xyz789",
  createdAt: "2026-01-15T10:00:00.000Z",
  updatedAt: "2026-01-15T10:05:00.000Z",
  user: { id: "user_1", name: "Jane Doe", email: "jane@example.com", phone: "9999999999" },
  address: {
    name: "Jane Doe",
    phone: "8888888888",
    houseArea: "221B Baker Street",
    area: "Sector 5",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411001",
  },
  orderItems: [
    { id: "item_1", quantity: 2, price: 999.5, product: { name: "Running Shoe" } },
  ],
  shipment: null,
  ...overrides,
});

const okResponse = (data) => ({ data: { data } });

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={[`/orders/${ORDER_ID}`]}>
      <Routes>
        <Route path="/orders/:id" element={<OrderViewPage />} />
      </Routes>
    </MemoryRouter>
  );

describe("OrderViewPage", () => {
  beforeEach(() => {
    apiClient.get.mockReset();
    apiClient.post.mockReset();
  });

  it("uses the real plural /api/orders/:id endpoint", async () => {
    apiClient.get.mockResolvedValue(okResponse(buildOrder()));

    renderPage();

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith(`/api/orders/${ORDER_ID}`, {
        __skipAuthHandling: true,
      })
    );
  });

  it("shows a loading state, then the order", async () => {
    apiClient.get.mockResolvedValue(okResponse(buildOrder()));

    renderPage();

    expect(screen.getByText(/loading order/i)).toBeInTheDocument();
    await screen.findByText("jane@example.com");
    expect(screen.getAllByText("Jane Doe").length).toBeGreaterThan(0);
  });

  it("shows customer identity: name, email, and phone", async () => {
    apiClient.get.mockResolvedValue(okResponse(buildOrder()));

    renderPage();

    await screen.findByText("jane@example.com");
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    expect(screen.getByText("9999999999")).toBeInTheDocument();
  });

  it("renders order status and payment status as independent badges", async () => {
    apiClient.get.mockResolvedValue(
      okResponse(buildOrder({ status: "shipped", paymentStatus: "paid" }))
    );

    renderPage();

    await screen.findByText("jane@example.com");
    expect(screen.getByText("Shipped")).toBeInTheDocument();
    expect(screen.getAllByText("Paid").length).toBeGreaterThan(0);
  });

  it("shows order items with quantity, unit price, and line total", async () => {
    apiClient.get.mockResolvedValue(okResponse(buildOrder()));

    renderPage();

    await screen.findByText("Running Shoe");
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("₹999.50")).toBeInTheDocument();
    expect(screen.getByText("₹1999.00")).toBeInTheDocument();
  });

  it("shows payment references returned by the backend, labeled clearly", async () => {
    apiClient.get.mockResolvedValue(okResponse(buildOrder()));

    renderPage();

    await screen.findByText("jane@example.com");
    expect(screen.getByText("order_rzp_abc123")).toBeInTheDocument();
    expect(screen.getByText("pay_rzp_xyz789")).toBeInTheDocument();
  });

  it("never shows a payment reference field the backend didn't return", async () => {
    apiClient.get.mockResolvedValue(
      okResponse(buildOrder({ payment_order_id: null, payment_id: null }))
    );

    renderPage();

    await screen.findByText("jane@example.com");
    expect(screen.queryByText(/razorpay/i)).not.toBeInTheDocument();
  });

  it("treats a 404 as a clean not-found state", async () => {
    apiClient.get.mockRejectedValue({ response: { status: 404 } });

    renderPage();

    expect(await screen.findByText(/order not found/i)).toBeInTheDocument();
  });

  it("treats a 422 (invalid id) as the same clean not-found state, never a raw validation error", async () => {
    apiClient.get.mockRejectedValue({
      response: { status: 422, data: { message: "Validation failed" } },
    });

    renderPage();

    expect(await screen.findByText(/order not found/i)).toBeInTheDocument();
    expect(screen.queryByText(/validation failed/i)).not.toBeInTheDocument();
  });

  it("shows an access-denied state on 403", async () => {
    apiClient.get.mockRejectedValue({ response: { status: 403 } });

    renderPage();

    expect(await screen.findByText(/access denied/i)).toBeInTheDocument();
  });

  it('shows "No shipment has been created" and a Create Shipment button for a confirmed order with no shipment', async () => {
    apiClient.get.mockResolvedValue(okResponse(buildOrder({ status: "confirmed", shipment: null })));

    renderPage();

    await screen.findByText("jane@example.com");
    expect(screen.getByText(/no shipment has been created/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create shipment/i })).toBeInTheDocument();
  });

  it("does not offer Create Shipment for a non-confirmed order with no shipment", async () => {
    apiClient.get.mockResolvedValue(okResponse(buildOrder({ status: "pending", shipment: null })));

    renderPage();

    await screen.findByText("jane@example.com");
    expect(screen.queryByRole("button", { name: /create shipment/i })).not.toBeInTheDocument();
  });

  it("creates a shipment via the real endpoint and refetches the order", async () => {
    apiClient.get
      .mockResolvedValueOnce(okResponse(buildOrder({ status: "confirmed", shipment: null })))
      .mockResolvedValueOnce(
        okResponse(
          buildOrder({
            status: "shipped",
            shipment: { status: "CREATED", courierPartner: "Ekart", paymentMode: "PREPAID" },
          })
        )
      );
    apiClient.post.mockResolvedValue({ data: { data: {} } });

    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: /create shipment/i }));

    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith(`/api/shipping/${ORDER_ID}/create`)
    );
    expect(await screen.findByText("Created")).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledTimes(2);
  });

  it("shows Refresh Tracking and Cancel Shipment when a non-terminal shipment exists", async () => {
    apiClient.get.mockResolvedValue(
      okResponse(
        buildOrder({
          status: "shipped",
          shipment: { status: "IN_TRANSIT", courierPartner: "Ekart", paymentMode: "PREPAID" },
        })
      )
    );

    renderPage();

    await screen.findByText("jane@example.com");
    expect(screen.getByRole("button", { name: /refresh tracking/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel shipment/i })).toBeInTheDocument();
  });

  it("hides Cancel Shipment once the shipment has reached a terminal status", async () => {
    apiClient.get.mockResolvedValue(
      okResponse(
        buildOrder({
          status: "delivered",
          shipment: { status: "DELIVERED", courierPartner: "Ekart", paymentMode: "PREPAID" },
        })
      )
    );

    renderPage();

    await screen.findByText("jane@example.com");
    expect(screen.queryByRole("button", { name: /cancel shipment/i })).not.toBeInTheDocument();
  });

  it("cancels a shipment via the real endpoint after confirmation, and refetches the order", async () => {
    apiClient.get
      .mockResolvedValueOnce(
        okResponse(
          buildOrder({
            status: "shipped",
            shipment: { status: "CREATED", courierPartner: "Ekart", paymentMode: "PREPAID" },
          })
        )
      )
      .mockResolvedValueOnce(
        okResponse(buildOrder({ status: "cancelled", shipment: { status: "CANCELLED" } }))
      );
    apiClient.post.mockResolvedValue({ data: { data: {} } });

    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: /cancel shipment/i }));

    const dialog = await screen.findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /cancel shipment/i }));

    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith(
        `/api/shipping/${ORDER_ID}/cancel`,
        expect.objectContaining({})
      )
    );
    // Both the order status and the shipment status badges read
    // "Cancelled" once the refetch lands — assert at least one shows up
    // rather than requiring a single unique match.
    await waitFor(() => expect(screen.getAllByText("Cancelled").length).toBeGreaterThan(0));
  });

  it("shows a clear error and does not fabricate a shipped state when shipment creation fails (e.g. carrier outage)", async () => {
    apiClient.get.mockResolvedValue(okResponse(buildOrder({ status: "confirmed", shipment: null })));
    apiClient.post.mockRejectedValue({
      response: { status: 503, data: { message: "Could not create shipment with Ekart right now. Please try again in a moment." } },
    });

    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: /create shipment/i }));

    expect(
      await screen.findByText(/could not create shipment with ekart right now/i)
    ).toBeInTheDocument();
    // A failed create must never be treated as success — the page should not
    // have refetched into a "shipped"/created state off the back of an error,
    // and the Create Shipment action should still be offered.
    expect(apiClient.get).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /create shipment/i })).toBeInTheDocument();
    expect(screen.queryByText(/^created$/i)).not.toBeInTheDocument();
  });

  it("shows a clear error when refreshing tracking fails, without discarding the last known shipment state", async () => {
    const orderWithShipment = okResponse(
      buildOrder({
        status: "shipped",
        shipment: { status: "IN_TRANSIT", courierPartner: "Ekart", paymentMode: "PREPAID", lastLocation: "Mumbai Hub" },
      })
    );
    // Initial load succeeds; the explicit "Refresh Tracking" GET (routed
    // through /track, not re-fetching the order) fails.
    apiClient.get.mockResolvedValueOnce(orderWithShipment).mockRejectedValueOnce({
      response: { status: 503, data: { message: "Could not check delivery availability right now. Please try again in a moment." } },
    });

    renderPage();

    await screen.findByText("jane@example.com");
    await userEvent.click(screen.getByRole("button", { name: /refresh tracking/i }));

    expect(
      await screen.findByText(/could not check delivery availability right now/i)
    ).toBeInTheDocument();
    // The last known shipment status stays visible — an outage never blanks
    // or fabricates shipment state.
    expect(screen.getByText("In Transit")).toBeInTheDocument();
    expect(screen.getByText("Mumbai Hub")).toBeInTheDocument();
  });

  it("shows a clear error inside the cancel dialog when cancellation fails, and does not close the dialog or change order status", async () => {
    apiClient.get.mockResolvedValue(
      okResponse(
        buildOrder({
          status: "shipped",
          shipment: { status: "CREATED", courierPartner: "Ekart", paymentMode: "PREPAID" },
        })
      )
    );
    apiClient.post.mockRejectedValue({
      response: { status: 400, data: { message: "Cannot cancel a shipment that is already 'DELIVERED'" } },
    });

    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: /cancel shipment/i }));
    const dialog = await screen.findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /cancel shipment/i }));

    expect(await within(dialog).findByText(/cannot cancel a shipment/i)).toBeInTheDocument();
    // Still only the initial load — a failed cancel must never be treated as
    // success by silently refetching into a new (fabricated) state.
    expect(apiClient.get).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("never invents a shipment status — displays exactly what the backend returned", async () => {
    apiClient.get.mockResolvedValue(
      okResponse(
        buildOrder({
          status: "shipped",
          shipment: { status: "OUT_FOR_DELIVERY", courierPartner: "Ekart", paymentMode: "PREPAID" },
        })
      )
    );

    renderPage();

    await screen.findByText("jane@example.com");
    expect(screen.getByText("Out For Delivery")).toBeInTheDocument();
  });
});
