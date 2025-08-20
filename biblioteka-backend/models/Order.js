import mongoose from "mongoose";
const { Schema, model } = mongoose;

// Trajni snimak podataka o knjizi u trenutku kreiranja porudžbine
const BookSnapshotSchema = new Schema({
  id:     { type: Schema.Types.ObjectId }, // originalni Book _id
  title:  { type: String },
  author: { type: String },
  year:   { type: Number },
  image:  { type: String }
}, { _id: false });

const orderSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  bookId: { type: Schema.Types.ObjectId, ref: "Book", required: false, default: null },
  bookSnapshot: { type: BookSnapshotSchema, default: null },
  status: { type: String, enum: ["active","returned","canceled","book_deleted"], default: "active" },

  rentedAt:   { type: Date, required: true, default: () => new Date() },
  returnedAt: { type: Date, default: null }
}, { timestamps: true });

// Korisni indeksi
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ bookId: 1 });

orderSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.userId = ret.userId?.toString() ?? null;
    ret.bookId = ret.bookId?.toString() ?? null;

    if (ret.bookSnapshot?.id) {
      ret.bookSnapshot.id = ret.bookSnapshot.id.toString();
    }

    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const Order = model("Order", orderSchema);
