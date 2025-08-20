import mongoose from "mongoose";
const { Schema, model } = mongoose;

const activitySchema = new Schema({
  type: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  meta: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: { createdAt: true, updatedAt: false } });

activitySchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    if (ret.userId) ret.userId = ret.userId.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const Activity = model("Activity", activitySchema);
