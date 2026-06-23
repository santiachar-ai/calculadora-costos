import { StockBalance, StockMovement } from "../../lib/types";

export function StockBalanceRow({ balance }: { balance: StockBalance }) {
  return (
    <tr>
      <td>{balance.warehouse.name}</td>
      <td>{balance.product.name}</td>
      <td>{Number(balance.quantityOnHand)}</td>
      <td>{Number(balance.quantityReserved ?? 0)}</td>
    </tr>
  );
}

export function StockMovementRow({ movement }: { movement: StockMovement }) {
  return (
    <tr>
      <td>{new Date(movement.movementDate).toLocaleString()}</td>
      <td>{movement.movementType}</td>
      <td>{movement.direction}</td>
      <td>{movement.warehouse.name}</td>
      <td>{movement.product.name}</td>
      <td>{Number(movement.quantity)}</td>
      <td>{movement.referenceDocument}</td>
    </tr>
  );
}
