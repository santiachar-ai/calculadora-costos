import { CostCalculatorOnline } from "../../../components/costos/cost-calculator-online";
import { CostExecutiveKpis } from "../../../components/costos/cost-executive-kpis";

export default function CostosPage() {
  return (
    <div className="page-shell">
      <CostExecutiveKpis />
      <CostCalculatorOnline />
    </div>
  );
}
