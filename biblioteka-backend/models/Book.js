import mongoose from "mongoose";
const { Schema, model } = mongoose;

const bookSchema = new Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  year: { type: String },
  image: { type: String, default: null },
  description: { type: String, default: null },
  rentedBy: { type: Schema.Types.ObjectId, ref: "User", default: null }
}, { timestamps: true });

bookSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    if (ret.rentedBy) ret.rentedBy = ret.rentedBy.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const Book = model("Book", bookSchema);
