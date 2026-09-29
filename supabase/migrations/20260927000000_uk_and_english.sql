-- Widen the country/language check constraints to allow the new UK market
-- and English UI locale. Postgres auto-names inline CHECK constraints as
-- "<table>_<column>_check", which is what the original migration produced.
alter table restaurants drop constraint restaurants_country_check;
alter table restaurants add constraint restaurants_country_check
  check (country in ('de', 'sa', 'ae', 'uk'));

alter table restaurants drop constraint restaurants_language_check;
alter table restaurants add constraint restaurants_language_check
  check (language in ('de', 'ar', 'en'));
