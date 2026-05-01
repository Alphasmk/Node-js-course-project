class ValidationMessage {
  constructor(status = false, field = "", message = "") {
    this._status = status;
    this._field = field;
    this._message = message;
  }

  setField(field) {
    this._field = field;
  }

  setMessage(message) {
    this._message = message;
  }

  get field() {
    return this._field;
  }

  get message() {
    return this._message;
  }

  get status() {
    return this._status;
  }
}

const validateAuth = (email, password) => {
  if (
    !email.match(
      /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    )
  ) {
    return new ValidationMessage(
      true,
      "email",
      "Email: некорректная эл. почта"
    );
  }
  if (email.length === 0) {
    return new ValidationMessage(true, "email", "Email: заполните поле");
  }
  if (password.length < 8 && password.length > 25) {
    return new ValidationMessage(
      true,
      "password",
      "Длина пароля: от 8 до 25 символов"
    );
  }
  if (password.length === 0) {
    return new ValidationMessage(true, "password", "Пароль: заполните поле");
  }
  return new ValidationMessage();
};