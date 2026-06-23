import { Router } from "express";

import { asyncHandler } from "../../lib/http";

import {
  createCustomer,
  createProduct,
  createWarehouse,
  listCustomers,
  listProducts,
  listUsers,
  listWarehouses,
} from "./masters.service";

export const mastersRouter = Router();

mastersRouter.get(
  "/users",
  asyncHandler(async (_req, res) => {
    const users = await listUsers();
    res.json(users);
  }),
);

mastersRouter.get(
  "/customers",
  asyncHandler(async (_req, res) => {
    const customers = await listCustomers();
    res.json(customers);
  }),
);

mastersRouter.post(
  "/customers",
  asyncHandler(async (req, res) => {
    const customer = await createCustomer(req.body);
    res.status(201).json(customer);
  }),
);

mastersRouter.get(
  "/warehouses",
  asyncHandler(async (_req, res) => {
    const warehouses = await listWarehouses();
    res.json(warehouses);
  }),
);

mastersRouter.post(
  "/warehouses",
  asyncHandler(async (req, res) => {
    const warehouse = await createWarehouse(req.body);
    res.status(201).json(warehouse);
  }),
);

mastersRouter.get(
  "/products",
  asyncHandler(async (_req, res) => {
    const products = await listProducts();
    res.json(products);
  }),
);

mastersRouter.post(
  "/products",
  asyncHandler(async (req, res) => {
    const product = await createProduct(req.body);
    res.status(201).json(product);
  }),
);
