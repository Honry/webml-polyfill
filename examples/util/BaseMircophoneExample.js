class BaseMircophoneExample extends BaseExample {
  constructor(models) {
    super(models);
  }

  _getDefaultInputType = () => {
    return 'audio';
  };

  _getDefaultInputMediaType = () => {
    return 'microphone';
  };

  _getMediaConstraints = () => {
    const constraints = {audio: true};
    return constraints;
  };
};