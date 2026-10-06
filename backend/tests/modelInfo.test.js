import { getModelInfo } from "../src/services/predictionService.js";

test("model metadata matches the copied model labels and evaluation report", async () => {
    const model = await getModelInfo();
    const earlyBlight = model.classes.find(item => item.label === "Tomato_Early_blight");

    expect(model.name).toBe("MobileNetV2 TensorFlow Lite");
    expect(model.classes).toHaveLength(15);
    expect(model.lowConfidenceThreshold).toBe(50);
    expect(model.crops).toEqual(["Bell Pepper", "Potato", "Tomato"]);
    expect(model.evaluation.accuracy).toBeCloseTo(0.862947, 5);
    expect(model.evaluation.testImages).toBe(3101);
    expect(earlyBlight.recall).toBeCloseTo(0.393333, 5);
});
