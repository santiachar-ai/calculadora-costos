import { DashboardClient } from "../../components/dashboard-client";
import { getDashboardData } from "../../lib/api";

export default async function StockPage() {
  const initialData = await getDashboardData();

  return <DashboardClient initialData={initialData} />;
}
