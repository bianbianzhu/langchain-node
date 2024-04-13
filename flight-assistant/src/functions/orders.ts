interface Order {
  id: string;
  order_date: string;
  customer_name: string;
  order_total: number;
  order_status:
    | "shipped"
    | "pending"
    | "delivered"
    | "processing"
    | "cancelled";
}

export async function getOrderStatus(orderId: string) {
  try {
    const response = await fetch(
      `http://localhost:${process.env.DB_PORT}/orders/${orderId}`
    );

    const data = (await response.json()) as Order;

    return data.order_status;
  } catch (error) {
    // console.error(error);
    return "An error occurred while fetching the order status.";
  }
}
