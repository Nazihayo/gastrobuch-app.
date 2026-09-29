-- G/L account numbers for the DATEV-format export. Defaults are common SKR03
-- values, but every Steuerberater's actual chart of accounts can differ —
-- these must be confirmed/adjusted by the restaurant before relying on the
-- export (surfaced as a disclaimer in the UI, not just here).
alter table restaurants
  add column datev_konto_food text not null default '8300',
  add column datev_konto_drink text not null default '8400',
  add column datev_konto_wages text not null default '4120',
  add column datev_konto_expenses text not null default '4200',
  add column datev_konto_bank text not null default '1000',
  add column datev_berater_nr text not null default '',
  add column datev_mandant_nr text not null default '';
