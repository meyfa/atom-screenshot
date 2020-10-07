'use babel'

const DEFAULT_PREFIX = 'screenshot.'

/**
 * Utility class for conveniently accessing config options.
 */
class Config {
  /**
   * @param {object} map The map object to be backing this instance.
   * @param {string} prefix The prefix to use when accessing the map.
   */
  constructor (map, prefix) {
    this.map = map
    this.prefix = prefix
  }

  /**
   * Obtain the setting with the given key.
   *
   * @param {string} name The key.
   * @returns {*} The setting's value.
   */
  getByName (name) {
    return this.map.get(this.prefix + name)
  }

  /**
   * @type {string}
   */
  get actionOnFinish () {
    return this.getByName('actionOnFinish')
  }

  /**
   * @type {boolean}
   */
  get openImage () {
    return this.getByName('openImage')
  }

  /**
   * @type {boolean}
   */
  get excludeTrailingNewline () {
    return this.getByName('excludeTrailingNewline')
  }

  /**
   * @type {boolean}
   */
  get includeLineNumbersAndGutter () {
    return this.getByName('includeLineNumbersAndGutter')
  }

  /**
   * @type {boolean}
   */
  get showWrapGuide () {
    return this.getByName('showWrapGuide')
  }
}

export default new Config(atom.config, DEFAULT_PREFIX)
