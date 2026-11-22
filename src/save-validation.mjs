const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
const typeMatches = (value, type) => type === "object" ? isObject(value)
  : type === "array" ? Array.isArray(value)
  : type === "integer" ? Number.isInteger(value)
  : type === "number" ? typeof value === "number" && Number.isFinite(value)
  : type === "null" ? value === null
  : type === "boolean" ? typeof value === "boolean"
  : type === "string" ? typeof value === "string"
  : true;

function validateNode(value, schema, path, errors) {
  if (schema.type && !typeMatches(value, schema.type)) { errors.push(`${path}: ${schema.type} expected`); return; }
  if (Object.hasOwn(schema, "const") && value !== schema.const) errors.push(`${path}: const mismatch`);
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${path}: enum mismatch`);
  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${path}: too short`);
    if (schema.format === "date-time" && (!Number.isFinite(Date.parse(value)) || !/^\d{4}-\d\d-\d\dT/.test(value))) errors.push(`${path}: invalid date-time`);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${path}: below minimum`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${path}: above maximum`);
    if (schema.multipleOf !== undefined && Math.abs(value / schema.multipleOf - Math.round(value / schema.multipleOf)) > 1e-9) errors.push(`${path}: invalid step`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${path}: too few items`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${path}: too many items`);
    if (schema.uniqueItems && new Set(value.map(item => JSON.stringify(item))).size !== value.length) errors.push(`${path}: duplicate items`);
    if (schema.items) value.forEach((item, index) => validateNode(item, schema.items, `${path}[${index}]`, errors));
  }
  if (isObject(value)) {
    for (const key of schema.required || []) if (!Object.hasOwn(value, key)) errors.push(`${path}.${key}: required`);
    for (const [key, child] of Object.entries(value)) {
      const childSchema = schema.properties?.[key];
      if (childSchema) validateNode(child, childSchema, `${path}.${key}`, errors);
      else if (schema.additionalProperties === false) errors.push(`${path}.${key}: unexpected property`);
      else if (isObject(schema.additionalProperties)) validateNode(child, schema.additionalProperties, `${path}.${key}`, errors);
    }
  }
  for (const branch of schema.anyOf || []) {
    const branchErrors = [];
    validateNode(value, branch, path, branchErrors);
    if (!branchErrors.length) { var anyOfMatched = true; break; }
  }
  if (schema.anyOf && !anyOfMatched) errors.push(`${path}: no anyOf branch matched`);
  for (const branch of schema.allOf || []) validateNode(value, branch, path, errors);
  if (schema.if) {
    const conditionErrors = [];
    validateNode(value, schema.if, path, conditionErrors);
    const branch = conditionErrors.length ? schema.else : schema.then;
    if (branch) validateNode(value, branch, path, errors);
  }
}

export function validateData(value, schema) {
  const errors = [];
  validateNode(value, schema, "$", errors);
  return errors;
}

export function validateConfig(config, schema) {
  const errors = validateData(config, schema);
  if (errors.length || !isObject(config)) return errors;
  const require = (condition, message) => { if (!condition) errors.push(message); };
  const types = Object.keys(config.customer || {});
  const unitCost = Object.values(config.ingredientCostsYen || {}).reduce((sum, value) => sum + value, 0);
  const points = Object.values(config.cooking?.stageMaxPoints || {}).reduce((sum, value) => sum + value, 0);
  const weights = Object.values(config.normalDay?.arrivalWeights || {}).reduce((sum, value) => sum + value, 0);
  require(config.schema === "katsumeshi-mvp-config/v0.5", "$.schema: unsupported config version");
  require(config.day1?.orderTypes?.length === 8 && types.every(type => config.day1.orderTypes.filter(item => item === type).length === 2), "$.day1.orderTypes: expected 8 orders with two of each customer");
  require(unitCost === 430, "$.ingredientCostsYen: expected unit cost 430");
  require(config.recipe?.priceYen === 980, "$.recipe.priceYen: expected 980");
  require(config.starting?.inventoryEachIngredient === 10, "$.starting.inventoryEachIngredient: expected 10");
  require(weights === 100, "$.normalDay.arrivalWeights: expected total 100");
  require(config.normalDay?.businessSeconds === 600 && config.normalDay?.queuedMax === 3 && config.normalDay?.cookingMax === 1, "$.normalDay: business duration/capacity mismatch");
  require(points === 100, "$.cooking.stageMaxPoints: expected total 100");
  require(config.sauce?.maxPresets === 1 + config.sauce?.customSlots && config.sauce?.immutablePresetId === "basic", "$.sauce: preset slot contract mismatch");
  return errors;
}

export function validateSave(snapshot, schema, config) {
  const errors = validateData(snapshot, schema);
  if (!isObject(snapshot) || errors.length) return errors;

  const orders = snapshot.orders;
  const sauceIds = new Set(snapshot.sauces.map(sauce => sauce.id));
  if (sauceIds.size !== snapshot.sauces.length) errors.push("$.sauces: duplicate preset id");
  const basic = snapshot.sauces.find(sauce => sauce.id === "basic");
  const initialTaste = config.starting.sauceTaste;
  if (!basic || ["sweetness", "richness", "acidity"].some(axis => basic.taste[axis] !== initialTaste[axis])) errors.push("$.sauces.basic: immutable preset mismatch");
  if (snapshot.sauces.some(sauce => !["basic", "custom1", "custom2"].includes(sauce.id))) errors.push("$.sauces: unknown preset id");
  const ids = new Set();
  for (const order of orders) {
    if (ids.has(order.id)) errors.push("$.orders: duplicate order id");
    ids.add(order.id);
    if (!Object.hasOwn(config.customer, order.customerId)) errors.push(`$.orders.${order.id}: unknown customer`);
    const shouldConsume = ["cooking", "cancelled", "served"].includes(order.state);
    if (order.ingredientsConsumed !== shouldConsume || order.settled !== (order.state === "served")) errors.push(`$.orders.${order.id}: state flags disagree`);
    if (shouldConsume && !order.appliedActionIds.includes("ACCEPT_ORDER")) errors.push(`$.orders.${order.id}: acceptance record missing`);
    if (order.settled && !order.appliedActionIds.includes("SERVE")) errors.push(`$.orders.${order.id}: serve record missing`);
    if (order.qualityBreakdown !== null) {
      const breakdown = order.qualityBreakdown;
      if (order.state !== "served" || !order.sauceSnapshot) errors.push(`$.orders.${order.id}.qualityBreakdown: result exists before serving`);
      const quality = Object.values(breakdown.stageScores).reduce((total, score) => total + score, 0);
      const taste = config.customer[order.customerId].taste;
      const distance = (Math.abs(order.sauceSnapshot.sweetness - taste[0]) + Math.abs(order.sauceSnapshot.richness - taste[1]) + Math.abs(order.sauceSnapshot.acidity - taste[2])) / 3;
      const bonus = config.cooking.customerSauceCorrection.max - config.cooking.customerSauceCorrection.distanceCoefficient * distance;
      const score = Math.max(0, Math.min(100, Math.round(quality + bonus)));
      const rank = ["SSS", "S", "A", "B", "C", "F"].find(name => score >= config.cooking.rankMinimum[name]);
      if (Math.abs(quality - breakdown.quality) > 1e-9 || Math.abs(distance - breakdown.tasteDistance) > 1e-9 || Math.abs(bonus - breakdown.tasteBonus) > 1e-9) errors.push(`$.orders.${order.id}.qualityBreakdown: values disagree`);
      if (breakdown.finalScore !== score || breakdown.finalScore !== order.cookingScore || breakdown.rank !== rank || order.rank !== rank) errors.push(`$.orders.${order.id}.qualityBreakdown: result mismatch`);
    }
  }
  const byState = state => orders.filter(order => order.state === state);
  if (byState("queued").length > 3 || byState("cooking").length > 1) errors.push("$.orders: queue capacity exceeded");
  const cooking = byState("cooking");
  if (snapshot.phase === "REACTION" && !["intro", "customerReaction", "resultVisible"].includes(snapshot.reactionStage)) errors.push("$.reactionStage: invalid reaction phase");
  if (snapshot.phase !== "REACTION" && snapshot.reactionStage !== null) errors.push("$.reactionStage: reaction phase outside REACTION");
  if (snapshot.phase === "COOK") {
    if (cooking.length !== 1 || cooking[0].id !== snapshot.activeOrderId || snapshot.cookingSession?.orderId !== snapshot.activeOrderId) errors.push("$.cookingSession: active order mismatch");
    if (snapshot.cookingSession && snapshot.cookingSession.stageIndex > 0) {
      for (let index = 0; index < snapshot.cookingSession.stageIndex; index++) if (!Object.hasOwn(snapshot.cookingSession.completedScores, `P${index + 1}`)) errors.push("$.cookingSession.completedScores: prior stage missing");
    }
    if (snapshot.cookingSession) {
      const input = snapshot.cookingSession.stageInput;
      const parts = ["rice", "cutlet", "sauce", "cabbage"];
      if (!parts.includes(input.selectedComponentId) && input.selectedComponentId !== null) errors.push("$.cookingSession.stageInput.selectedComponentId: unknown component");
      if (input.placedComponentIds.length !== input.placedSlotIds.length || new Set(input.placedSlotIds).size !== input.placedSlotIds.length) errors.push("$.cookingSession.stageInput: component and slot placements disagree");
      if (input.selectedComponentId !== null && input.placedComponentIds.includes(input.selectedComponentId)) errors.push("$.cookingSession.stageInput.selectedComponentId: component already placed");
      for (let z = 0; z < 3; z++) { const cells = input.coatCellMask[z].toString(2).replaceAll("0", "").length; if (Math.abs(input.coatCoverage01[z] - cells / 10) > 1e-9) errors.push("$.cookingSession.stageInput.coatCoverage01: cell count mismatch"); }
      if (input.timerStarted && input.timerStopped) errors.push("$.cookingSession.stageInput: timer cannot be started and stopped");
      for (let index = snapshot.cookingSession.stageIndex + 1; index <= 6; index++) if (!(snapshot.cookingSession.stageIndex === 5 && index === 6) && Object.hasOwn(snapshot.cookingSession.completedScores, `P${index}`)) errors.push("$.cookingSession.completedScores: future stage already complete");
      if (!snapshot.sauces.some(sauce => sauce.id === snapshot.cookingSession.selectedSauceId)) errors.push("$.cookingSession.selectedSauceId: unknown preset");
    }
  } else if (cooking.length || snapshot.activeOrderId !== null || snapshot.cookingSession !== null) errors.push("$.activeOrderId: cooking state outside COOK phase");
  if (snapshot.phase === "REACTION") {
    const order = orders.find(item => item.id === snapshot.lastServedOrderId);
    if (!order || order.state !== "served" || order.rank !== snapshot.lastReactionRank) errors.push("$.lastServedOrderId: reaction order mismatch");
  }
  if (snapshot.activeStoryEventId && snapshot.seenStoryEventIds.includes(snapshot.activeStoryEventId)) errors.push("$.activeStoryEventId: event already seen");
  for (const [state, field] of [["served", "providedCount"], ["cancelled", "cancelledCount"], ["expired", "expiredCount"]]) {
    if (byState(state).length !== snapshot.dailyLedger[field]) errors.push(`$.dailyLedger.${field}: order count mismatch`);
  }
  const sum = (list, field) => list.reduce((total, order) => total + (order[field] || 0), 0);
  if (sum(byState("served"), "priceYenSnapshot") !== snapshot.dailyLedger.salesYen) errors.push("$.dailyLedger.salesYen: order total mismatch");
  const consumedOrders = orders.filter(order => order.ingredientsConsumed);
  if (sum(consumedOrders, "ingredientCostYenSnapshot") !== snapshot.dailyLedger.ingredientConsumedYen) errors.push("$.dailyLedger.ingredientConsumedYen: inventory cost mismatch");
  if (sum(byState("cancelled"), "ingredientCostYenSnapshot") !== snapshot.dailyLedger.wasteYen) errors.push("$.dailyLedger.wasteYen: cancelled order mismatch");
  const shouldBeClosed = ["RESULT", "UPGRADE"].includes(snapshot.phase);
  if (snapshot.dayClosed !== shouldBeClosed || snapshot.dayOverheadSettled !== shouldBeClosed) errors.push("$.dayClosed: phase and close flags disagree");
  if (["RESULT", "UPGRADE"].includes(snapshot.phase) && orders.some(order => ["queued", "cooking"].includes(order.state))) errors.push("$.orders: unfinished orders remain after close");
  if (snapshot.phase === "MORNING" && orders.length) errors.push("$.orders: morning must not retain prior-day orders");
  const ledgers = [snapshot.careerLedger, snapshot.dailyLedger];
  const expectedCash = config.starting.cashYen + ledgers.reduce((total, ledger) => total + ledger.salesYen - ledger.purchasesYen - ledger.overheadYen - ledger.payrollYen - ledger.upgradePurchasesYen, 0);
  if (expectedCash !== snapshot.cashYen) errors.push("$.cashYen: ledger balance mismatch");
  const queuedCount = byState("queued").length;
  if (snapshot.phase === "OPEN" && snapshot.day !== 1 && snapshot.openingRemainingSeconds === 0 && !queuedCount && !cooking.length) errors.push("$.phase: day should already be closed");
  return errors;
}
