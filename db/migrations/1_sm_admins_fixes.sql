-- migrate:up
-- Modifies base plugin db

ALTER TABLE sm_admins 
  ADD UNIQUE KEY `unique_identity` (`identity`),
  ADD UNIQUE KEY `sm_admins_authtype_identity_uindex` (`authtype`, `identity`);
-- migrate:down

