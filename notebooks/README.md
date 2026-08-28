# Notebooks

## Celsius to Fahrenheit Converter (`celsius_to_fahrenheit.ipynb`)

Trains a small PyTorch MLP to convert Celsius temperatures to Fahrenheit. The notebook:

- Generates its own synthetic training/validation data (no external dataset needed)
- Defines and trains a small MLP, tracking loss and accuracy each epoch
- Plots training/validation loss and accuracy curves
- Evaluates the trained model on the test cases from
  [CrossCures/crosscures#1](https://github.com/CrossCures/crosscures/issues/1) and reports
  test accuracy

### Running it

```bash
pip install -r notebooks/requirements.txt
jupyter notebook notebooks/celsius_to_fahrenheit.ipynb
```
