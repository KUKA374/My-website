"use strict";
class Fault extends Error {
  constructor(status, code, message, usage = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.usage = usage;
  }
}
module.exports = { Fault };
