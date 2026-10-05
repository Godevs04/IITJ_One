import type { AiActionName } from '@iitj1/types';
import { createHolidayAction, removeHolidayAction, updateHolidayAction } from './holidays';
import { createMessPricingAction, deactivateMessPricingAction, temporaryMessUpdateAction, updateMessPricingAction } from './mess';
import { createNotice, deleteNotice, updateNotice } from './notices';
import { cancelBusTripAction, createTransportAlertAction, updateTransportAlertAction } from './transport';
import type { ActionDefinition } from './types';

/** The complete, closed set of executable actions. Nothing else can reach a service. */
export const ACTIONS: Record<AiActionName, ActionDefinition> = {
  create_notice: createNotice,
  update_notice: updateNotice,
  delete_notice: deleteNotice,
  create_mess_pricing: createMessPricingAction,
  update_mess_pricing: updateMessPricingAction,
  deactivate_mess_pricing: deactivateMessPricingAction,
  create_transport_alert: createTransportAlertAction,
  update_transport_alert: updateTransportAlertAction,
  cancel_bus_trip: cancelBusTripAction,
  create_holiday: createHolidayAction,
  update_holiday: updateHolidayAction,
  remove_holiday: removeHolidayAction,
  temporary_mess_update: temporaryMessUpdateAction,
};


export type { ActionContext, ActionDefinition, Params } from './types';
