export type PlanType = "annuel" | "mensuel";

export function getToggleNotificationMessage(planType: PlanType, enabled: boolean) {
  if (enabled) {
    return {
      title: "Rappel active",
      body:
        planType === "annuel"
          ? "Rappel actif: votre lecture du plan annuel vous attend chaque jour."
          : "Rappel actif: pensez a avancer sur votre plan mensuel.",
    };
  }

  return {
    title: "Rappel desactive",
    body:
      planType === "annuel"
        ? "Rappels annuels desactives."
        : "Rappels mensuels desactives.",
  };
}

export function getDelayNotificationMessage(planType: PlanType, delay: number) {
  if (planType === "annuel") {
    return {
      title: "Retard de lecture",
      body: `Plan annuel: vous avez ${delay} jour${delay > 1 ? "s" : ""} de retard.`,
    };
  }

  return {
    title: "Retard de lecture",
    body: `Plan mensuel: vous avez ${delay} mois de retard.`,
  };
}
