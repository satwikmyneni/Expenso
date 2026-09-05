interface DataFailure {
  code?: string;
  message?: string;
}

export function dataError(error: DataFailure, action: "load" | "save" | "delete" = "save") {
  const message = (error.message ?? "").toLowerCase();
  if (error.code === "23505") return new Error("That record already exists.");
  if (error.code === "23503") return new Error("A related account or category is no longer available.");
  if (error.code === "23514") return new Error("One or more values are not valid for this record.");
  if (error.code === "42501" || message.includes("row-level security")) return new Error("You do not have permission to change this record.");
  if (error.code === "PGRST116") return new Error("The requested record was not found.");
  if (action === "load") return new Error("We couldn't load your financial data. Please try again.");
  if (action === "delete") return new Error("We couldn't delete that record. Please try again.");
  return new Error("We couldn't save your changes. Please try again.");
}
