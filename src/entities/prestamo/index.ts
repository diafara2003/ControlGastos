export {
  getPrestamos,
  createPrestamo,
  updatePrestamo,
  deletePrestamo,
  addPayment,
  deletePayment,
  getDistinctContacts,
} from "./api/prestamosApi";
export type {
  Prestamo,
  PrestamoPayment,
  PrestamoType,
  PrestamoStatus,
} from "./model/types";
