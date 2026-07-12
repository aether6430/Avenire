ALTER TABLE "file_asset" ADD COLUMN "upload_session_id" text;
CREATE UNIQUE INDEX "file_asset_upload_session_uidx" ON "file_asset" USING btree ("upload_session_id");
