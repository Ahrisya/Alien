import type { APIRoute } from "astro";

type D1Database = {
  prepare: (query: string) => D1PreparedStatement;
};

type D1PreparedStatement = {
  all: <T = unknown>() => Promise<{ results?: T[] }>;
  bind: (...values: unknown[]) => D1PreparedStatement;
  first: <T = unknown>() => Promise<T | null>;
  run: () => Promise<unknown>;
};

type Runtime = {
  env?: {
    DB?: D1Database;
  };
};

type SignalCellRow = {
  latitude: number;
  longitude: number;
  signal_count: number;
  last_signal_at: string;
};

function isValidCoordinate(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function getDatabase(locals: App.Locals): D1Database | null {
  return ((locals.runtime as Runtime | undefined)?.env?.DB ?? null) as D1Database | null;
}

function toCell(latitude: number, longitude: number) {
  const cellLatitude = Math.round(latitude);
  const cellLongitude = Math.round(longitude);

  return {
    cellId: `${cellLatitude}:${cellLongitude}`,
    latitude: cellLatitude,
    longitude: cellLongitude
  };
}

async function getTotals(db: D1Database) {
  const row = await db
    .prepare(
      `SELECT
        COALESCE(SUM(signal_count), 0) AS totalClicks,
        COUNT(*) AS totalLocations,
        MAX(last_signal_at) AS lastSignalAt
      FROM signal_cells`
    )
    .first<{
      lastSignalAt: string | null;
      totalClicks: number;
      totalLocations: number;
    }>();

  return {
    lastSignalAt: row?.lastSignalAt ?? null,
    totalClicks: Number(row?.totalClicks ?? 0),
    totalLocations: Number(row?.totalLocations ?? 0)
  };
}

async function toResponse(db: D1Database) {
  const [totals, cells] = await Promise.all([
    getTotals(db),
    db
      .prepare(
        `SELECT latitude, longitude, signal_count, last_signal_at
        FROM signal_cells
        ORDER BY datetime(last_signal_at) DESC, signal_count DESC
        LIMIT 1000`
      )
      .all<SignalCellRow>()
  ]);

  return Response.json({
    totalClicks: totals.totalClicks,
    totalLocations: totals.totalLocations,
    lastSignalAt: totals.lastSignalAt,
    signals: (cells.results ?? []).map((cell) => ({
      latitude: Number(cell.latitude),
      longitude: Number(cell.longitude),
      signalCount: Number(cell.signal_count),
      lastSignalAt: cell.last_signal_at
    }))
  });
}

export const GET: APIRoute = async ({ locals }) => {
  const db = getDatabase(locals);

  if (!db) {
    return Response.json({ message: "D1 binding DB is not configured." }, { status: 500 });
  }

  return toResponse(db);
};

export const POST: APIRoute = async ({ locals, request }) => {
  const db = getDatabase(locals);

  if (!db) {
    return Response.json({ message: "D1 binding DB is not configured." }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as {
    accuracy?: unknown;
    latitude?: unknown;
    longitude?: unknown;
  } | null;
  const latitude = typeof body?.latitude === "number" ? body.latitude : Number.NaN;
  const longitude = typeof body?.longitude === "number" ? body.longitude : Number.NaN;

  if (!isValidCoordinate(latitude, -90, 90) || !isValidCoordinate(longitude, -180, 180)) {
    return Response.json({ message: "Location is required." }, { status: 400 });
  }

  const cell = toCell(latitude, longitude);
  const lastSignalAt = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO signal_cells (cell_id, latitude, longitude, signal_count, last_signal_at)
      VALUES (?, ?, ?, 1, ?)
      ON CONFLICT(cell_id) DO UPDATE SET
        signal_count = signal_count + 1,
        last_signal_at = excluded.last_signal_at`
    )
    .bind(cell.cellId, cell.latitude, cell.longitude, lastSignalAt)
    .run();

  return toResponse(db);
};
