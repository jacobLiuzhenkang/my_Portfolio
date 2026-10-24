import { upgradePortfolioContent } from "./upgrade-portfolio";

upgradePortfolioContent()
  .then(result => {
    console.log("Portfolio content update:", result);
    process.exit(0);
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
