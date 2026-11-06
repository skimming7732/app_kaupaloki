export const formatAmountInput = (value: string) => {
  const [integer, decimal] = value.replace(/,/g, '').split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decimal === undefined ? grouped : `${grouped}.${decimal}`;
};

export const formatAmountField = (input: HTMLInputElement) => {
  const entered = input.value;
  if (!/^[\d,]*(?:\.\d*)?$/.test(entered)) return;

  const formatted = formatAmountInput(entered);
  const digitsBeforeCaret = entered.slice(0, input.selectionStart ?? entered.length).replace(/,/g, '').length;
  let caret = 0;
  for (let remaining = digitsBeforeCaret; remaining > 0 && caret < formatted.length; caret++) {
    if (formatted[caret] !== ',') remaining--;
  }
  input.value = formatted;
  input.setSelectionRange(caret, caret);
  return formatted;
};
