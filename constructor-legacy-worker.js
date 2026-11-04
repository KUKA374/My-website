/* Read legacy authored data without invoking its page-specific cloud bootstrap. */
self.window = self;
self.document = { readyState: "loading", addEventListener() {} };
importScripts("lesson-content.js");
self.postMessage({
  content: typeof lessonContent === "object" ? lessonContent : {},
});
