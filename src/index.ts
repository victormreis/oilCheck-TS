import express from "express";
import type { Request, Response } from "express";
import { db } from "./db.js";

const app = express();
app.use(express.json());

interface CheckInput {
  currentOdometer: number;
  previousOdometer: number;
  previousDate: string; // "YYYY-MM-DD"
}

interface OilCheckRow {
  id: number;
  current_odometer: number;
  previous_odometer: number;
  previous_date: string;
  created_at: string;
}


function isDueForOilChange(input: CheckInput): boolean {
  const kmSinceLastChange = input.currentOdometer - input.previousOdometer;
  const monthsSinceLastChange =
    (Date.now() - new Date(input.previousDate).getTime()) /
    (1000 * 60 * 60 * 24 * 30);

  return kmSinceLastChange > 5000 || monthsSinceLastChange > 6;
}

app.post("/checks", (req: Request, res: Response) => {
  const { currentOdometer, previousOdometer, previousDate } = req.body as Partial<CheckInput>;

  if (
    currentOdometer === undefined ||
    previousOdometer === undefined ||
    previousDate === undefined
  ) {
    return res.status(422).json({ error: "All fields are required" });
  }

  if (currentOdometer < previousOdometer) {
    return res
      .status(422)
      .json({ error: "Current odometer must be greater or equal to previous odometer" });
  }

  const parsedDate = new Date(previousDate);
  if (isNaN(parsedDate.getTime()) || parsedDate > new Date()) {
    return res.status(422).json({ error: "Previous date must be valid and in the past" });
  }

  const due = isDueForOilChange({ currentOdometer, previousOdometer, previousDate });

  const stmt = db.prepare(`
    INSERT INTO oil_checks (current_odometer, previous_odometer, previous_date)
    VALUES (?, ?, ?)
  `);
  const result = stmt.run(currentOdometer, previousOdometer, previousDate);

  res.status(201).json({
    id: result.lastInsertRowid,
    due,
    currentOdometer,
    previousOdometer,
    previousDate,
  });
});

app.get("/checks/:id", (req: Request, res: Response) => {
  const stmt = db.prepare("SELECT * FROM oil_checks WHERE id = ?");
  const row = stmt.get(req.params.id) as OilCheckRow | undefined;

  if (!row) {
    return res.status(404).json({ error: "Check not found" });
  }

  const due = isDueForOilChange({
    currentOdometer: row.current_odometer,
    previousOdometer: row.previous_odometer,
    previousDate: row.previous_date,
  });

  res.json({
    id: row.id,
    due,
    currentOdometer: row.current_odometer,
    previousOdometer: row.previous_odometer,
    previousDate: row.previous_date,
  });
});


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});