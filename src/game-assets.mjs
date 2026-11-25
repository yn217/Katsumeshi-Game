export const ingredientAssets = Object.freeze({
  beef: "food/v06/raw_beef_flattened_chatgpt_v06.webp",
  rice: "food/v06/steamed_rice_chatgpt_v06.webp",
  coating: "food/v06/panko_crumbs_chatgpt_v06.webp",
  sauce: "food/v06/demi_glace_sauce_chatgpt_v06.webp",
  cabbage: "food/v06/boiled_cabbage_chatgpt_v06.webp",
});

export const stagePhotos = Object.freeze([
  "food/v06/raw_beef_flattened_chatgpt_v06.webp",
  "food/v07/breaded_beef_chatgpt_v01.webp",
  "food/v06/fried_cutlet_chatgpt_v06.webp",
  "food/v06/demi_glace_sauce_chatgpt_v06.webp",
  "food/v06/boiled_cabbage_chatgpt_v06.webp",
  "food/v06/steamed_rice_chatgpt_v06.webp",
]);

export const stageTools = Object.freeze([
  "cooking/v07/tools/meat_mallet_chatgpt_v07.webp",
  "cooking/v07/tools/breading_tray_chatgpt_v07.webp",
  null,
  "cooking/v07/tools/sauce_ladle_chatgpt_v07.webp",
  "cooking/v07/tools/cabbage_pot_chatgpt_v07.webp",
  "cooking/v07/tools/rice_paddle_chatgpt_v07.webp",
]);

export const runtimeFoodAssets = Object.freeze(
  [...new Set([...Object.values(ingredientAssets), ...stagePhotos])],
);
