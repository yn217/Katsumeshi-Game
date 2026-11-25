const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
const isDateTime = value => {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-](\d{2}):(\d{2}))$/.exec(value);
  if (!match || !Number.isFinite(Date.parse(value))) return false;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, zone, , zoneMinuteText] = match;
  const year = Number(yearText), month = Number(monthText), day = Number(dayText);
  const hour = Number(hourText), minute = Number(minuteText), second = Number(secondText);
  const zoneHour = zone === "Z" ? 0 : Number(zone.slice(1, 3)), zoneMinute = zone === "Z" ? 0 : Number(zoneMinuteText);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= monthDays[month - 1]
    && hour <= 23 && minute <= 59 && second <= 59 && zoneHour <= 23 && zoneMinute <= 59;
};
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
    if (schema.format === "date-time" && !isDateTime(value)) errors.push(`${path}: invalid date-time`);
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
    const prefixItems = schema.prefixItems || [];
    prefixItems.forEach((itemSchema, index) => { if (index < value.length) validateNode(value[index], itemSchema, `${path}[${index}]`, errors); });
    if (schema.items) value.forEach((item, index) => { if (index >= prefixItems.length) validateNode(item, schema.items, `${path}[${index}]`, errors); });
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
  if (schema.oneOf) {
    const matched = schema.oneOf.filter(branch => { const branchErrors = []; validateNode(value, branch, path, branchErrors); return branchErrors.length === 0; }).length;
    if (matched !== 1) errors.push(`${path}: expected exactly one oneOf branch`);
  }
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
  require(config.mvpMilestone?.day === 7 && config.mvpMilestone?.canContinueAfter === true, "$.mvpMilestone: expected Day7 milestone with continued play");
  require(weights === 100, "$.normalDay.arrivalWeights: expected total 100");
  require(config.normalDay?.businessSeconds === 600 && config.normalDay?.queuedMax === 3 && config.normalDay?.cookingMax === 1, "$.normalDay: business duration/capacity mismatch");
  require(config.normalDay.arrivalFirstSecond + config.normalDay.arrivalSpreadSeconds <= config.normalDay.businessSeconds, "$.normalDay: arrival schedule exceeds business duration");
  require(config.inventory?.purchaseQuantities?.join(",") === "1,5,10", "$.inventory.purchaseQuantities: expected 1, 5, and 10 meal units");
  require(config.cooking?.p2Zones === 3 && config.cooking?.p2CellsPerZone === 10, "$.cooking: P2 requires three zones of ten cells");
  require(points === 100, "$.cooking.stageMaxPoints: expected total 100");
  require(config.cooking?.fixedSauceQualityPoints === config.cooking?.stageMaxPoints?.P4, "$.cooking.fixedSauceQualityPoints: must equal P4 maximum");
  require(config.sauce?.maxPresets === 1 + config.sauce?.customSlots && config.sauce?.immutablePresetId === "basic", "$.sauce: preset slot contract mismatch");
  const upgrades = Array.isArray(config.upgrades) ? config.upgrades : [];
  const upgradeById = new Map(upgrades.map(upgrade => [upgrade.id, upgrade]));
  require(upgrades.length === 2 && upgradeById.size === 2 && upgradeById.has("fryer") && upgradeById.has("chairs"), "$.upgrades: expected one fryer and one chairs upgrade");
  const fryer = upgradeById.get("fryer");
  const chairs = upgradeById.get("chairs");
  require(fryer?.unlockDay === 2 && fryer?.costYen === 8000 && fryer?.effect?.p3WindowSeconds === config.cooking?.p3UpgradedWindowSeconds, "$.upgrades.fryer: cost, effective day, or cooking effect mismatch");
  require(chairs?.unlockDay === 3 && chairs?.costYen === 5000 && chairs?.effect?.patienceMultiplier === 1.1, "$.upgrades.chairs: cost, effective day, or patience effect mismatch");
  return errors;
}

export function validateCustomerDialogue(document, config) {
  const errors = [];
  if (!isObject(document) || document.schema !== "katsumeshi-customer-dialogue-ja/v1" || !isObject(document.customers))
    return ["$: invalid customer dialogue document"];
  const ranks = ["SSS", "S", "A", "B", "C", "F"];
  const expectedCustomers = Object.keys(config.customer);
  for (const id of expectedCustomers) {
    const customer = document.customers[id];
    if (!isObject(customer)) { errors.push(`$.customers.${id}: required customer dialogue missing`); continue; }
    if (!Array.isArray(customer.hints) || customer.hints.length !== 2 || customer.hints.some(text => typeof text !== "string" || !text.trim()))
      errors.push(`$.customers.${id}.hints: exactly two non-empty hints required`);
    if (!isObject(customer.ranks)) { errors.push(`$.customers.${id}.ranks: rank dialogue object required`); continue; }
    for (const rank of ranks) if (typeof customer.ranks[rank] !== "string" || !customer.ranks[rank].trim())
      errors.push(`$.customers.${id}.ranks.${rank}: non-empty dialogue required`);
    if (Object.keys(customer.ranks).some(rank => !ranks.includes(rank))) errors.push(`$.customers.${id}.ranks: unknown rank key`);
  }
  if (Object.keys(document.customers).some(id => !expectedCustomers.includes(id))) errors.push("$.customers: unknown customer type");
  return errors;
}

export function validateStoryEvents(document, config) {
  const errors = [];
  if (!isObject(document) || document.schema !== "katsumeshi-story-events-ja/v1" || !Array.isArray(document.events)) {
    return ["$: invalid story event document"];
  }
  const required = new Map([
    ["day1_result", [1, "RESULT"]], ["day2_morning", [2, "MORNING"]],
    ["day3_morning", [3, "MORNING"]], ["day4_morning", [4, "MORNING"]],
    ["day5_morning", [5, "MORNING"]], ["day6_morning", [6, "MORNING"]],
    ["day7_result", [7, "RESULT"]],
  ]);
  const ids = new Set();
  const ownerPortraits = new Set(["normal", "encourage", "happy", "sad", "surprised", "thinking"]);
  const customerPortraits = new Set(["SSS", "S", "A", "B", "C", "F"]);
  for (const [index, event] of document.events.entries()) {
    const label = `$.events[${index}]`;
    if (!isObject(event)) { errors.push(`${label}: event object expected`); continue; }
    if (typeof event.id !== "string" || !event.id) errors.push(`${label}.id: non-empty id required`);
    else if (ids.has(event.id)) errors.push(`${label}.id: duplicate event id`);
    else ids.add(event.id);
    const expected = required.get(event.id);
    if (expected && (event.day !== expected[0] || event.trigger !== expected[1])) errors.push(`${label}: required event day/trigger mismatch`);
    if (typeof event.day !== "number" || !Number.isInteger(event.day) || event.day < 1) errors.push(`${label}.day: positive integer required`);
    if (!["MORNING", "RESULT"].includes(event.trigger)) errors.push(`${label}.trigger: unsupported phase`);
    for (const key of ["title", "text", "speakerLabel"]) if (typeof event[key] !== "string" || !event[key].trim()) errors.push(`${label}.${key}: non-empty text required`);
    if (event.priority !== "mandatory_story" || event.once !== true) errors.push(`${label}: mandatory once-only story metadata required`);
    const owner = event.speakerId === "owner";
    if (!owner && !Object.hasOwn(config.customer, event.speakerId)) errors.push(`${label}.speakerId: unknown speaker`);
    const portraits = owner ? ownerPortraits : customerPortraits;
    if (!portraits.has(event.portraitAssetId)) errors.push(`${label}.portraitAssetId: unknown portrait`);
    for (const key of ["textIfFryer", "textIfChairs", "textIfReputation30", "textIfReputation60", "textIfReputation80", "textIfReputationBelow30"])
      if (Object.hasOwn(event, key) && (typeof event[key] !== "string" || !event[key].trim())) errors.push(`${label}.${key}: non-empty text required when present`);
  }
  for (const id of required.keys()) if (!ids.has(id)) errors.push(`$.events: required event ${id} missing`);
  const day7 = document.events.find(event => event?.id === "day7_result");
  if (day7 && ["textIfReputation30", "textIfReputation60", "textIfReputation80", "textIfReputationBelow30"].some(key => typeof day7[key] !== "string" || !day7[key].trim())) errors.push("$.events.day7_result: all reputation outcome texts required");
  return errors;
}

function normalDayDraws(seed, day, count, weights) {
  let state = (seed ^ Math.imul(day, 0x9e3779b9)) >>> 0;
  if (!state) state = 0x6d2b79f5;
  const customers = [];
  for (let index = 0; index < count; index++) {
    let value = state >>> 0;
    value ^= value << 13; value ^= value >>> 17; value ^= value << 5;
    state = value >>> 0;
    const roll = state / 4294967296;
    let cumulative = 0, customer = "tourist";
    for (const [id, weight] of Object.entries(weights)) {
      cumulative += weight / 100;
      if (roll < cumulative) { customer = id; break; }
    }
    customers.push(customer);
  }
  return { state, customers };
}

export function validateSave(snapshot, schema, config, storyEvents = []) {
  const errors = validateData(snapshot, schema);
  if (!isObject(snapshot) || errors.length) return errors;

  const orders = snapshot.orders;
  const customerIds = Object.keys(config.customer), affinityIds = Object.keys(snapshot.customerAffinity);
  if (affinityIds.length !== customerIds.length || customerIds.some(id => !Object.hasOwn(snapshot.customerAffinity, id)))
    errors.push("$.customerAffinity: keys must match configured customer types");
  if (snapshot.unlockedRecipeIds.length !== 1 || snapshot.unlockedRecipeIds[0] !== config.recipe.id) errors.push("$.unlockedRecipeIds: MVP must contain only the configured recipe");
  if (snapshot.activeStoryEventId && snapshot.overlay?.kind !== "EVENT") errors.push("$.activeStoryEventId: pending story requires an event overlay");
  if (!snapshot.activeStoryEventId && snapshot.overlay?.kind === "EVENT") errors.push("$.overlay: event overlay requires an active story");
  if (snapshot.overlay?.kind === "EVENT" && (!snapshot.activeStoryEventId || snapshot.overlay.eventId !== snapshot.activeStoryEventId)) errors.push("$.overlay.eventId: event overlay and active story disagree");
  if (snapshot.overlay?.kind === "PAUSE" && snapshot.activeStoryEventId) errors.push("$.overlay: pause and active story cannot overlap");
  if (snapshot.aidGrantedDay !== null && snapshot.aidGrantedDay !== snapshot.day) errors.push("$.aidGrantedDay: aid marker must belong to the current day");
  if (snapshot.nextOrderSequence !== orders.length) errors.push("$.nextOrderSequence: sequence and order ledger disagree");
  orders.forEach((order, index) => {
    if (order.id !== `d${snapshot.day}_o${index + 1}`) errors.push(`$.orders[${index}].id: daily sequence mismatch`);
    if (snapshot.day === 1 && order.customerId !== config.day1.orderTypes[index]) errors.push(`$.orders[${index}].customerId: Day1 tutorial order mismatch`);
  });
  const sauceIds = new Set(snapshot.sauces.map(sauce => sauce.id));
  if (sauceIds.size !== snapshot.sauces.length) errors.push("$.sauces: duplicate preset id");
  const basic = snapshot.sauces.find(sauce => sauce.id === config.sauce.immutablePresetId);
  const initialTaste = config.starting.sauceTaste;
  if (!basic || ["sweetness", "richness", "acidity"].some(axis => basic.taste[axis] !== initialTaste[axis])) errors.push(`$.sauces.${config.sauce.immutablePresetId}: immutable preset mismatch`);
  const customSauceIds = new Set(Array.from({ length: config.sauce.customSlots }, (_, index) => `custom${index + 1}`));
  if (snapshot.sauces.length > config.sauce.maxPresets || snapshot.sauces.some(sauce => sauce.id !== config.sauce.immutablePresetId && !customSauceIds.has(sauce.id))) errors.push("$.sauces: unknown preset id or preset capacity exceeded");
  for (const sauce of snapshot.sauces) {
    if (["sweetness", "richness", "acidity"].some(axis => {
      const value = sauce.taste[axis];
      return !Number.isInteger(value) || value < config.sauce.min || value > config.sauce.max
        || (value - config.sauce.min) % config.sauce.step !== 0;
    })) errors.push(`$.sauces.${sauce.id}.taste: value outside configured range or step`);
  }
  const ids = new Set();
  const expectedIngredientCost = Object.values(config.ingredientCostsYen).reduce((total, amount) => total + amount, 0);
  for (const order of orders) {
    if (ids.has(order.id)) errors.push("$.orders: duplicate order id");
    ids.add(order.id);
    if (!Object.hasOwn(config.customer, order.customerId)) errors.push(`$.orders.${order.id}: unknown customer`);
    if (order.priceYenSnapshot !== config.recipe.priceYen) errors.push(`$.orders.${order.id}.priceYenSnapshot: fixed recipe price mismatch`);
    if (order.ingredientCostYenSnapshot !== expectedIngredientCost) errors.push(`$.orders.${order.id}.ingredientCostYenSnapshot: fixed recipe cost mismatch`);
    if (order.createdAtGameSeconds > snapshot.businessElapsedSeconds) errors.push(`$.orders.${order.id}.createdAtGameSeconds: order created in the future`);
    if (order.state === "queued" && snapshot.day > 1 && order.queuedWaitRemainingSeconds <= 0) errors.push(`$.orders.${order.id}.queuedWaitRemainingSeconds: expired order remains queued`);
    if (snapshot.day > 1) {
      const chairMultiplier = snapshot.unlockedUpgradeIds.includes("chairs") ? (config.upgrades.find(upgrade => upgrade.id === "chairs")?.effect?.patienceMultiplier ?? 1) : 1;
      const maxPatience = config.normalDay.basePatienceSeconds * chairMultiplier * (config.customer[order.customerId]?.patienceMultiplier ?? 1);
      if (order.queuedWaitRemainingSeconds > maxPatience) errors.push(`$.orders.${order.id}.queuedWaitRemainingSeconds: exceeds configured patience`);
    }
    if (order.state === "expired" && order.queuedWaitRemainingSeconds !== 0) errors.push(`$.orders.${order.id}.queuedWaitRemainingSeconds: expired order must have zero patience`);
    if (snapshot.day === 1 && order.state === "expired") errors.push(`$.orders.${order.id}.state: Day1 tutorial orders cannot expire`);
    const shouldConsume = ["cooking", "cancelled", "served"].includes(order.state);
    if (order.ingredientsConsumed !== shouldConsume || order.settled !== (order.state === "served")) errors.push(`$.orders.${order.id}: state flags disagree`);
    if (order.state === "served" && (!order.sauceSnapshot || order.cookingScore === null || order.rank === null)) errors.push(`$.orders.${order.id}: served result is incomplete`);
    if (order.state !== "served" && (order.sauceSnapshot !== null || order.cookingScore !== null || order.qualityBreakdown !== null || order.rank !== null)) errors.push(`$.orders.${order.id}: unserved order contains a result snapshot`);
    if (order.appliedActionIds.some(actionId => !["ACCEPT_ORDER", "SERVE"].includes(actionId))) errors.push(`$.orders.${order.id}.appliedActionIds: unknown order action`);
    if (shouldConsume !== order.appliedActionIds.includes("ACCEPT_ORDER")) errors.push(`$.orders.${order.id}: acceptance record disagrees with state`);
    if ((order.state === "served") !== order.appliedActionIds.includes("SERVE")) errors.push(`$.orders.${order.id}: serve record disagrees with state`);
    if (order.qualityBreakdown !== null) {
      const breakdown = order.qualityBreakdown;
      if (order.state !== "served" || !order.sauceSnapshot) {
        errors.push(`$.orders.${order.id}.qualityBreakdown: result exists before serving`);
        continue;
      }
      const customer = config.customer[order.customerId];
      if (!customer) continue;
      const quality = Object.values(breakdown.stageScores).reduce((total, score) => total + score, 0);
      if (breakdown.stageScores.P4 !== config.cooking.fixedSauceQualityPoints) errors.push(`$.orders.${order.id}.qualityBreakdown.stageScores.P4: fixed score mismatch`);
      const taste = customer.taste;
      const distance = (Math.abs(order.sauceSnapshot.sweetness - taste[0]) + Math.abs(order.sauceSnapshot.richness - taste[1]) + Math.abs(order.sauceSnapshot.acidity - taste[2])) / 3;
      const bonus = config.cooking.customerSauceCorrection.max - config.cooking.customerSauceCorrection.distanceCoefficient * distance;
      const score = Math.max(0, Math.min(100, Math.round(quality + bonus)));
      const rank = ["SSS", "S", "A", "B", "C", "F"].find(name => score >= config.cooking.rankMinimum[name]);
      if (Math.abs(quality - breakdown.quality) > 1e-9 || Math.abs(distance - breakdown.tasteDistance) > 1e-9 || Math.abs(bonus - breakdown.tasteBonus) > 1e-9) errors.push(`$.orders.${order.id}.qualityBreakdown: values disagree`);
      if (breakdown.finalScore !== score || breakdown.finalScore !== order.cookingScore || breakdown.rank !== rank || order.rank !== rank) errors.push(`$.orders.${order.id}.qualityBreakdown: result mismatch`);
    }
  }
  const byState = state => orders.filter(order => order.state === state);
  const queueLimit = snapshot.day === 1 ? config.day1.queueMax : config.normalDay.queuedMax;
  if (byState("queued").length > queueLimit || byState("cooking").length > config.normalDay.cookingMax) errors.push("$.orders: queue capacity exceeded");
  const dayOneTutorialSteps = {
    MORNING: [0, 2], OPEN: [0, 3, 4, 5, 6, 7, 8, 9], COOK: [0, 4, 5, 6, 7, 8, 9],
    REACTION: [0, 10], RESULT: [0, 11], UPGRADE: [0, 11]
  };
  if (snapshot.day === 1 && !dayOneTutorialSteps[snapshot.phase]?.includes(snapshot.tutorialStep)) errors.push("$.tutorialStep: Day1 tutorial step and phase disagree");
  if (snapshot.day === 2 && snapshot.tutorialStep !== 0 && !(snapshot.phase === "MORNING" && snapshot.tutorialStep === 12)) errors.push("$.tutorialStep: Day2 tutorial may only continue from MORNING");
  if (snapshot.day > 2 && snapshot.tutorialStep !== 0) errors.push("$.tutorialStep: tutorial is complete after Day2");
  if (snapshot.day === 1 && snapshot.tutorialFirstServed !== (byState("served").length > 0)) errors.push("$.tutorialFirstServed: Day1 serve history mismatch");
  const cooking = byState("cooking");
  if (snapshot.phase === "REACTION" && !["intro", "customerReaction", "resultVisible"].includes(snapshot.reactionStage)) errors.push("$.reactionStage: invalid reaction phase");
  if (snapshot.phase !== "REACTION" && snapshot.reactionStage !== null) errors.push("$.reactionStage: reaction phase outside REACTION");
  if (snapshot.phase === "COOK") {
    if (cooking.length !== 1 || cooking[0].id !== snapshot.activeOrderId || snapshot.cookingSession?.orderId !== snapshot.activeOrderId) errors.push("$.cookingSession: active order mismatch");
    if (snapshot.cookingSession && snapshot.cookingSession.stageIndex > 0) {
      for (let index = 0; index < snapshot.cookingSession.stageIndex; index++) if (!Object.hasOwn(snapshot.cookingSession.completedScores, `P${index + 1}`)) errors.push("$.cookingSession.completedScores: prior stage missing");
    }
    if (snapshot.cookingSession?.retriesRemaining > config.cooking.maxRetriesPerDish) errors.push("$.cookingSession.retriesRemaining: exceeds configured per-dish retry allowance");
    if (snapshot.cookingSession?.completedScores.P4 !== undefined && snapshot.cookingSession.completedScores.P4 !== config.cooking.fixedSauceQualityPoints) errors.push("$.cookingSession.completedScores.P4: fixed score mismatch");
    if (snapshot.cookingSession) {
      const input = snapshot.cookingSession.stageInput;
      const parts = config.cooking.p6Parts;
      if (snapshot.cookingSession.stageIndex === 0) {
        if (input.taps !== input.strikeXs.length) errors.push("$.cookingSession.stageInput: strike count mismatch");
        const targets = config.cooking.p1TargetsX;
        const expectedError = input.taps === 0 ? 1 : input.strikeXs.reduce((total, x, index) => total + Math.max(0, Math.min(1, Math.abs(x - targets[index]) / config.cooking.p1ErrorDenominator)), 0) / input.taps;
        if (Math.abs(input.thicknessError01 - expectedError) > 1e-9) errors.push("$.cookingSession.stageInput.thicknessError01: strike error mismatch");
      }
      if (!parts.includes(input.selectedComponentId) && input.selectedComponentId !== null) errors.push("$.cookingSession.stageInput.selectedComponentId: unknown component");
      if (input.placedComponentIds.length !== input.placedSlotIds.length || new Set(input.placedSlotIds).size !== input.placedSlotIds.length) errors.push("$.cookingSession.stageInput: component and slot placements disagree");
      if (input.selectedComponentId !== null && input.placedComponentIds.includes(input.selectedComponentId)) errors.push("$.cookingSession.stageInput.selectedComponentId: component already placed");
      if (snapshot.cookingSession.stageIndex === 5 && Object.hasOwn(snapshot.cookingSession.completedScores, "P6")) {
        const partCount = config.cooking.p6Parts.length;
        const p6Score = input.placedComponentIds.reduce((score, component, index) => score + (component === parts[index] && input.placedSlotIds[index] === component ? config.cooking.stageMaxPoints.P6 / partCount : 0), 0);
        if (input.placedComponentIds.length !== partCount || snapshot.cookingSession.completedScores.P6 !== p6Score) errors.push("$.cookingSession.completedScores.P6: placement score mismatch");
      }
      for (let z = 0; z < config.cooking.p2Zones; z++) { const cells = input.coatCellMask[z].toString(2).replaceAll("0", "").length; if (Math.abs(input.coatCoverage01[z] - cells / config.cooking.p2CellsPerZone) > 1e-9) errors.push("$.cookingSession.stageInput.coatCoverage01: cell count mismatch"); }
      if (input.timerStarted && input.timerStopped) errors.push("$.cookingSession.stageInput: timer cannot be started and stopped");
      if ((input.timerStarted || input.timerStopped) && ![2, 4].includes(snapshot.cookingSession.stageIndex)) errors.push("$.cookingSession.stageInput: timer state outside timed stage");
      if (input.elapsedSeconds > 0 && !input.timerStarted && !input.timerStopped) errors.push("$.cookingSession.stageInput.elapsedSeconds: elapsed time without timer state");
      for (let index = snapshot.cookingSession.stageIndex + 1; index <= 6; index++) if (!(snapshot.cookingSession.stageIndex === 5 && index === 6) && Object.hasOwn(snapshot.cookingSession.completedScores, `P${index}`)) errors.push("$.cookingSession.completedScores: future stage already complete");
      const selectedSauce = snapshot.sauces.find(sauce => sauce.id === snapshot.cookingSession.selectedSauceId);
      if (!selectedSauce) errors.push("$.cookingSession.selectedSauceId: unknown preset");
      else if (["sweetness", "richness", "acidity"].some(axis => selectedSauce.taste[axis] !== snapshot.cookingSession.sauceSnapshot[axis])) errors.push("$.cookingSession.sauceSnapshot: selected preset mismatch");
    }
  } else if (cooking.length || snapshot.activeOrderId !== null || snapshot.cookingSession !== null) errors.push("$.activeOrderId: cooking state outside COOK phase");
  if (snapshot.phase === "REACTION") {
    const order = orders.find(item => item.id === snapshot.lastServedOrderId);
    if (!order || order.state !== "served" || order.rank !== snapshot.lastReactionRank) errors.push("$.lastServedOrderId: reaction order mismatch");
  }
  if (storyEvents.length) {
    const eventIds = new Set(storyEvents.map(event => event.id));
    if (new Set(snapshot.seenStoryEventIds).size !== snapshot.seenStoryEventIds.length) errors.push("$.seenStoryEventIds: duplicate event id");
    if (snapshot.seenStoryEventIds.some(id => !eventIds.has(id))) errors.push("$.seenStoryEventIds: unknown event id");
    const phaseOrder = { MORNING: 0, OPEN: 1, COOK: 2, REACTION: 3, RESULT: 4, UPGRADE: 5 };
    for (const id of snapshot.seenStoryEventIds) {
      const event = storyEvents.find(item => item.id === id);
      if (event && (event.day > snapshot.day || (event.day === snapshot.day && phaseOrder[snapshot.phase] < phaseOrder[event.trigger]))) {
        errors.push(`$.seenStoryEventIds.${id}: event marked seen before its trigger`);
      }
    }
    for (const event of storyEvents) {
      if (event.priority !== "mandatory_story" || !event.once || event.day > snapshot.day) continue;
      const eventPhasePassed = event.day < snapshot.day || phaseOrder[snapshot.phase] >= phaseOrder[event.trigger];
      const canStillBeActive = event.day === snapshot.day && event.trigger === snapshot.phase;
      if (eventPhasePassed && !snapshot.seenStoryEventIds.includes(event.id)
        && (!canStillBeActive || snapshot.activeStoryEventId !== event.id)) {
        errors.push(`$.activeStoryEventId: mandatory event ${event.id} was skipped before this phase`);
      }
    }
  }
  if (snapshot.activeStoryEventId && snapshot.seenStoryEventIds.includes(snapshot.activeStoryEventId)) errors.push("$.activeStoryEventId: event already seen");
  if (snapshot.activeStoryEventId && storyEvents.length) {
    const event = storyEvents.find(item => item.id === snapshot.activeStoryEventId);
    if (!event) errors.push("$.activeStoryEventId: unknown event");
    else if (event.day !== snapshot.day || event.trigger !== snapshot.phase) errors.push("$.activeStoryEventId: trigger phase/day mismatch");
  }
  for (const [state, field] of [["served", "providedCount"], ["cancelled", "cancelledCount"], ["expired", "expiredCount"]]) {
    if (byState(state).length !== snapshot.dailyLedger[field]) errors.push(`$.dailyLedger.${field}: order count mismatch`);
  }
  const sum = (list, field) => list.reduce((total, order) => total + (order[field] || 0), 0);
  if (sum(byState("served"), "priceYenSnapshot") !== snapshot.dailyLedger.salesYen) errors.push("$.dailyLedger.salesYen: order total mismatch");
  const consumedOrders = orders.filter(order => order.ingredientsConsumed);
  if (sum(consumedOrders, "ingredientCostYenSnapshot") !== snapshot.dailyLedger.ingredientConsumedYen) errors.push("$.dailyLedger.ingredientConsumedYen: inventory cost mismatch");
  if (sum(byState("cancelled"), "ingredientCostYenSnapshot") !== snapshot.dailyLedger.wasteYen) errors.push("$.dailyLedger.wasteYen: cancelled order mismatch");
  if (snapshot.day === 1 && snapshot.openingRemainingSeconds !== null) errors.push("$.openingRemainingSeconds: Day1 must use the tutorial clock");
  if (snapshot.day > 1 && snapshot.openingRemainingSeconds === null) errors.push("$.openingRemainingSeconds: normal days require the business clock");
  if (snapshot.phase === "MORNING" && snapshot.businessElapsedSeconds !== 0) errors.push("$.businessElapsedSeconds: morning must start before business time");
  if (snapshot.phase === "MORNING" && snapshot.day > 1 && snapshot.openingRemainingSeconds !== config.normalDay.businessSeconds) errors.push("$.openingRemainingSeconds: normal morning clock must be reset to business duration");
  if (snapshot.day === 1 && (snapshot.arrivalSeconds.length !== 0 || snapshot.nextArrivalIndex !== 0 || snapshot.tutorialNextOrderIndex !== orders.length || snapshot.tutorialNextOrderIndex > config.day1.orderTypes.length || snapshot.remainingArrivals !== config.day1.orderTypes.length - snapshot.tutorialNextOrderIndex)) errors.push("$.arrivalSeconds: Day1 tutorial order counters disagree");
  if (snapshot.day > 1) {
    const closed = ["RESULT", "UPGRADE"].includes(snapshot.phase);
    const expectedRemaining = closed ? 0 : snapshot.arrivalSeconds.length - snapshot.nextArrivalIndex;
    if (snapshot.nextArrivalIndex > snapshot.arrivalSeconds.length || snapshot.remainingArrivals !== expectedRemaining) errors.push("$.arrivalSeconds: normal arrival counters disagree");
  }
  if (snapshot.day > 1 && snapshot.nextArrivalIndex !== orders.length + snapshot.dailyLedger.skippedCandidates) errors.push("$.nextArrivalIndex: issued and skipped candidates disagree");
  if (snapshot.day > 1) {
    const schedule = snapshot.arrivalSeconds;
    if (snapshot.phase === "MORNING" && schedule.length !== 0) errors.push("$.arrivalSeconds: MORNING must not have issued the arrival schedule");
    if (snapshot.phase !== "MORNING" && (schedule.length < config.normalDay.arrivalBase || schedule.length > config.normalDay.arrivalMaximum)) errors.push("$.arrivalSeconds: opened day requires a valid candidate count");
    const count = schedule.length;
    if (count) for (let index = 0; index < count; index++) {
      const expected = config.normalDay.arrivalFirstSecond + Math.floor(index * config.normalDay.arrivalSpreadSeconds / count);
      if (schedule[index] !== expected) { errors.push("$.arrivalSeconds: candidate schedule mismatch"); break; }
    }
    if (snapshot.phase !== "MORNING" && count) {
      const draws = normalDayDraws(snapshot.seed, snapshot.day, snapshot.nextArrivalIndex, config.normalDay.arrivalWeights);
      if (snapshot.rngState !== draws.state) errors.push("$.rngState: normal-day PRNG draw count mismatch");
      const mappedCandidates = new Set();
      for (const order of orders) {
        const candidateIndex = schedule.findIndex((arrivalSecond, index) => index < snapshot.nextArrivalIndex
          && order.createdAtGameSeconds >= arrivalSecond - 1e-9
          && order.createdAtGameSeconds <= arrivalSecond + 0.101 + 1e-9);
        if (candidateIndex < 0) errors.push(`$.orders.${order.id}.createdAtGameSeconds: no processed candidate matches order`);
        else {
          if (mappedCandidates.has(candidateIndex)) errors.push(`$.orders.${order.id}: candidate arrival already assigned`);
          mappedCandidates.add(candidateIndex);
          if (order.customerId !== draws.customers[candidateIndex]) errors.push(`$.orders.${order.id}.customerId: seeded candidate draw mismatch`);
        }
      }
    }
  }
  const shouldBeClosed = ["RESULT", "UPGRADE"].includes(snapshot.phase);
  if (snapshot.dayClosed !== shouldBeClosed || snapshot.dayOverheadSettled !== shouldBeClosed) errors.push("$.dayClosed: phase and close flags disagree");
  if (snapshot.dailyLedger.overheadYen !== (shouldBeClosed ? config.economy.overheadYenPerDay : 0)) errors.push("$.dailyLedger.overheadYen: close cost mismatch");
  if (snapshot.dailyLedger.payrollYen !== (shouldBeClosed ? config.economy.payrollYenPerDay : 0)) errors.push("$.dailyLedger.payrollYen: payroll close cost mismatch");
  if (["RESULT", "UPGRADE"].includes(snapshot.phase) && orders.some(order => ["queued", "cooking"].includes(order.state))) errors.push("$.orders: unfinished orders remain after close");
  if (snapshot.phase === "MORNING" && orders.length) errors.push("$.orders: morning must not retain prior-day orders");
  const unlockedUpgradeCost = config.upgrades.filter(upgrade => snapshot.unlockedUpgradeIds.includes(upgrade.id)).reduce((total, upgrade) => total + upgrade.costYen, 0);
  if (snapshot.careerLedger.upgradePurchasesYen + snapshot.dailyLedger.upgradePurchasesYen !== unlockedUpgradeCost) errors.push("$.unlockedUpgradeIds: purchase ledger mismatch");
  for (const upgrade of config.upgrades) if (snapshot.unlockedUpgradeIds.includes(upgrade.id)
    && (snapshot.day + 1 < upgrade.unlockDay || (snapshot.day + 1 === upgrade.unlockDay && snapshot.phase !== "UPGRADE"))) {
    errors.push(`$.unlockedUpgradeIds.${upgrade.id}: purchased before its upgrade phase`);
  }
  if (snapshot.phase !== "UPGRADE" && snapshot.dailyLedger.upgradePurchasesYen !== 0) errors.push("$.dailyLedger.upgradePurchasesYen: purchase outside UPGRADE");
  const ledgers = [snapshot.careerLedger, snapshot.dailyLedger];
  const expectedCash = config.starting.cashYen + ledgers.reduce((total, ledger) => total + ledger.salesYen - ledger.purchasesYen - ledger.overheadYen - ledger.payrollYen - ledger.upgradePurchasesYen, 0);
  if (expectedCash !== snapshot.cashYen) errors.push("$.cashYen: ledger balance mismatch");
  const queuedCount = byState("queued").length;
  if (snapshot.phase === "OPEN" && snapshot.day !== 1 && snapshot.openingRemainingSeconds === 0 && !queuedCount && !cooking.length) errors.push("$.phase: day should already be closed");
  return errors;
}
