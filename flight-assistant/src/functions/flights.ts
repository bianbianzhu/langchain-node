interface Flight {
  id: string;
  flight_number: string;
  departure_airport: string;
  arrival_airport: string;
  departure_date: string;
  arrival_date: string;
  ticket_stock: number;
}

interface GetFlightsOpts {
  flightNumber: string;
  name: string;
  passportNumber: string;
  numberOfTickets: number;
  email: string;
}

type Booking =
  | ({
      booking_status: "success";
      booking_id: string;
      event?: string;
    } & GetFlightsOpts)
  | {
      booking_status: "failed";
      reason: string;
    };

export async function getFlights(options: {
  origin: string;
  destination: string;
}): Promise<string> {
  const { origin, destination } = options;
  try {
    const response = await fetch(
      `http://localhost:${process.env.DB_PORT}/flights?departure_airport=${origin}&arrival_airport=${destination}`
    );
    const data = (await response.json()) as Flight[];

    return data.map((flight) => flight.flight_number).join(", ");
  } catch (error) {
    return "An error occurred while fetching the flights.";
  }
}

export async function bookFlight(options: GetFlightsOpts): Promise<string> {
  const { flightNumber, numberOfTickets } = options;
  try {
    const response = await fetch(
      `http://localhost:${process.env.DB_PORT}/flights?flight_number=${flightNumber}`
    );

    // be careful, the data is an array of flights
    const data = (await response.json()) as Flight[];

    // handle no flight found
    if (data.length === 0) {
      const failedBooking: Booking = {
        booking_status: "failed",
        reason: "Flight not found",
      };
      return JSON.stringify(failedBooking);
    }

    // due to noUncheckedIndexedAccess, we need to check if data[0] exists
    if (data[0] && data[0].ticket_stock < numberOfTickets) {
      const failedBooking: Booking = {
        booking_status: "failed",
        reason: "Insufficient ticket stock",
      };
      return JSON.stringify(failedBooking);
    } else {
      const successfulBooking: Booking = {
        booking_status: "success",
        booking_id: Math.random().toString(36).substring(7),
        event: "15% off on your next booking!",
        ...options,
      };
      return JSON.stringify(successfulBooking);
    }
  } catch (error) {
    return "An error occurred while booking the flight.";
  }
}
