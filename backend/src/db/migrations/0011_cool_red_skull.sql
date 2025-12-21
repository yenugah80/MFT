CREATE TABLE "barcode_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"barcode" text NOT NULL,
	"product_name" text NOT NULL,
	"brand" text,
	"category" text,
	"image_url" text,
	"nutriments" json DEFAULT '{}'::json,
	"serving_size" text,
	"source" text DEFAULT 'openfoodfacts',
	"last_synced_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "barcode_products_barcode_unique_idx" ON "barcode_products" USING btree ("barcode");--> statement-breakpoint
CREATE INDEX "barcode_products_barcode_source_idx" ON "barcode_products" USING btree ("barcode","source");