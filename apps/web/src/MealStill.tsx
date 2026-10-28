import layout from "../../../packages/motion/combo/fallback-layout.json";

export default function MealStill({ stage }: { stage: number }) {
  return <div className="meal-still" aria-hidden="true">{layout.stages[stage].foods.map(food => <img key={food.file} src={`/assets/carousel-${food.file}.webp`} alt="" style={{ width: `${food.imageWidth / layout.width * 100}%`, height: `${food.imageHeight / layout.height * 100}%`, left: `${food.centerX / layout.width * 100}%`, top: `${food.centerY / layout.height * 100}%` }} />)}</div>;
}

