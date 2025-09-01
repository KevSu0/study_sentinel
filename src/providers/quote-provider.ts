/**
 * Quote Provider for managing motivational quotes
 */
export class QuoteProvider {
  private quotes: string[] = [
    "The secret of getting ahead is getting started.",
    "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    "Don't watch the clock; do what it does. Keep going.",
    "The future depends on what you do today.",
    "It always seems impossible until it's done."
  ];

  /**
   * Get a random motivational quote
   */
  getRandomQuote(): string {
    const randomIndex = Math.floor(Math.random() * this.quotes.length);
    return this.quotes[randomIndex];
  }

  /**
   * Get quote of the day (based on current date)
   */
  getQuoteOfTheDay(): string {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const index = dayOfYear % this.quotes.length;
    return this.quotes[index];
  }

  /**
   * Add a custom quote
   */
  addQuote(quote: string): void {
    if (quote.trim() && !this.quotes.includes(quote)) {
      this.quotes.push(quote.trim());
    }
  }
}

// Export singleton instance
export const quoteProvider = new QuoteProvider();