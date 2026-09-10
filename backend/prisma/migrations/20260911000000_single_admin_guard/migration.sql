-- Guards against a race in the "first registered account becomes admin" flow:
-- two concurrent POST /auth/register calls on a fresh instance could otherwise
-- both observe user count 0 and both be created as ADMIN. This partial unique
-- index makes a second concurrent ADMIN insert fail at the database level.
CREATE UNIQUE INDEX "User_singleton_admin" ON "User" ((role)) WHERE "role" = 'ADMIN';
