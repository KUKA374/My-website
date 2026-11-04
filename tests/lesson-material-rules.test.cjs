/* Actual Firestore emulator tests. No mocks can satisfy this suite. */
const { test, before, after } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  { createRequire } = require("node:module"),
  path = require("node:path");
const tooling = process.env.IUSTAZ_FIREBASE_TOOLS || "/tmp/iustaz-8a-tools";
const localRequire = createRequire(path.join(tooling, "package.json"));
const { initializeTestEnvironment, assertSucceeds, assertFails } = localRequire(
  "@firebase/rules-unit-testing",
);
const {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  serverTimestamp,
} = localRequire("firebase/firestore");
const id = "ktp1:6:math:1:1",
  second = "ktp1:6:math:1:2";
let env;
const db = (uid) => env.authenticatedContext(uid).firestore(),
  video = () => ({
    schemaVersion: 1,
    lessonId: id,
    provider: "youtube",
    videoId: "abcdefghijk",
    title: "Тест видеосы",
    status: "published",
    updatedBy: "admin",
    updatedAt: serverTimestamp(),
  }),
  personal = (uid, lessonId = id) => ({
    schemaVersion: 1,
    ownerId: uid,
    lessonId,
    homeworkText: "Жеке есеп",
    notes: "",
    revision: 1,
    updatedAt: serverTimestamp(),
  });
before(async () => {
  assert.ok(
    process.env.FIRESTORE_EMULATOR_HOST,
    "Start the local emulator; production endpoints are never used",
  );
  env = await initializeTestEnvironment({
    projectId: "demo-iustaz-stage8a",
    firestore: {
      host: "127.0.0.1",
      port: 8187,
      rules: fs.readFileSync("security/lesson-materials-v1.rules", "utf8"),
    },
  });
  await env.withSecurityRulesDisabled(async (c) => {
    const d = c.firestore();
    for (const [uid, role] of [
      ["alice", "teacher"],
      ["bob", "teacher"],
      ["admin", "admin"],
      ["super", "super_admin"],
      ["student", "student"],
    ])
      await setDoc(doc(d, "users", uid), { role });
    for (const n of [id, second])
      await setDoc(doc(d, "curriculumLessonRefs", n), { schemaVersion: 1 });
    await setDoc(doc(d, "lessonPresentations", "fraction-block"), {
      schemaVersion: 1,
      presentationId: "fraction-block",
      title: "Тест теориясы",
      slideCount: 12,
      slides: Array.from({ length: 12 }, () => ({ text: "test" })),
      status: "published",
    });
    await setDoc(doc(d, "lessonContentV1", id), {
      schemaVersion: 1,
      lessonId: id,
      status: "published",
      material: { schemaVersion: 1, lessonId: id, presentation: null },
    });
    await setDoc(doc(d, "lessonContentV1", second), {
      schemaVersion: 1,
      lessonId: second,
      status: "draft",
      material: { schemaVersion: 1, lessonId: second, presentation: null },
    });
  });
});
after(async () => {
  await env?.cleanup();
});
test("server isolates private homework by UID and lesson, including from admins", async () => {
  const a = db("alice"),
    b = db("bob");
  await assertSucceeds(
    setDoc(
      doc(a, "teacherLessonOverrides/alice/lessons", id),
      personal("alice"),
    ),
  );
  await assertSucceeds(
    getDoc(doc(a, "teacherLessonOverrides/alice/lessons", id)),
  );
  await assertFails(getDoc(doc(b, "teacherLessonOverrides/alice/lessons", id)));
  await assertFails(
    getDoc(doc(db("admin"), "teacherLessonOverrides/alice/lessons", id)),
  );
  await assertFails(
    setDoc(
      doc(b, "teacherLessonOverrides/alice/lessons", second),
      personal("alice", second),
    ),
  );
  await assertSucceeds(
    setDoc(doc(b, "teacherLessonOverrides/bob/lessons", id), personal("bob")),
  );
});
test("server rejects reassignment, extra shared fields, bad revision, unknown lesson and collection enumeration", async () => {
  const a = db("alice"),
    p = doc(a, "teacherLessonOverrides/alice/lessons", id);
  await assertFails(
    updateDoc(p, { ownerId: "bob", revision: 2, updatedAt: serverTimestamp() }),
  );
  await assertFails(
    updateDoc(p, {
      videoId: "abcdefghijk",
      revision: 2,
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(p, { revision: 9, updatedAt: serverTimestamp() }),
  );
  await assertFails(
    setDoc(
      doc(a, "teacherLessonOverrides/alice/lessons", "unknown"),
      personal("alice", "unknown"),
    ),
  );
  await assertFails(
    getDocs(collection(a, "teacherLessonOverrides/alice/lessons")),
  );
  await assertSucceeds(
    updateDoc(p, {
      homeworkText: "Жаңартылған",
      revision: 2,
      updatedAt: serverTimestamp(),
    }),
  );
});
test("only profile-authorized admin roles publish video; token role spoofing and teachers fail", async () => {
  const path = ["lessonVideoMetadata", id];
  await assertFails(
    setDoc(doc(db("alice"), ...path), { ...video(), updatedBy: "alice" }),
  );
  await assertFails(
    setDoc(
      doc(
        env.authenticatedContext("student", { role: "admin" }).firestore(),
        ...path,
      ),
      { ...video(), updatedBy: "student" },
    ),
  );
  await assertSucceeds(setDoc(doc(db("admin"), ...path), video()));
  await assertSucceeds(
    updateDoc(doc(db("super"), ...path), {
      title: "Әкімшілік түзету",
      updatedBy: "super",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(db("alice"), ...path), {
      status: "draft",
      updatedAt: serverTimestamp(),
    }),
  );
});
test("anonymous and students cannot read materials; teachers read only published documents", async () => {
  await assertFails(
    getDoc(
      doc(env.unauthenticatedContext().firestore(), "lessonContentV1", id),
    ),
  );
  await assertFails(getDoc(doc(db("student"), "lessonContentV1", id)));
  await assertSucceeds(getDoc(doc(db("alice"), "lessonContentV1", id)));
  await assertFails(getDoc(doc(db("alice"), "lessonContentV1", second)));
  await assertSucceeds(getDoc(doc(db("admin"), "lessonContentV1", second)));
  await assertFails(getDocs(collection(db("alice"), "lessonContentV1")));
});
test("server presentation ranges use one shared block, reject out-of-range and KTP authoring fields", async () => {
  const admin = db("admin"),
    m = {
      schemaVersion: 1,
      lessonId: id,
      presentation: { id: "fraction-block", startSlide: 1, endSlide: 8 },
    };
  const payload = {
    schemaVersion: 1,
    lessonId: id,
    status: "draft",
    material: m,
    updatedBy: "admin",
    updatedAt: serverTimestamp(),
  };
  await assertSucceeds(setDoc(doc(admin, "lessonContentV1", id), payload));
  await assertSucceeds(
    setDoc(doc(admin, "lessonContentV1", second), {
      ...payload,
      lessonId: second,
      material: {
        ...m,
        lessonId: second,
        presentation: { id: "fraction-block", startSlide: 9, endSlide: 12 },
      },
    }),
  );
  await assertFails(
    updateDoc(doc(admin, "lessonContentV1", second), {
      material: {
        ...m,
        lessonId: second,
        presentation: { id: "fraction-block", startSlide: 9, endSlide: 13 },
      },
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(admin, "lessonContentV1", id), {
      material: { ...m, title: "КТП-ны өзгерту" },
      updatedAt: serverTimestamp(),
    }),
  );
});
test("KTP registry and role profiles remain unwriteable, and legacy material permissions stay intact", async () => {
  for (const uid of ["alice", "admin", "super"]) {
    await assertFails(
      setDoc(doc(db(uid), "curriculumLessonRefs", id), { title: "bad" }),
    );
    await assertFails(
      updateDoc(doc(db(uid), "users", uid), { role: "super_admin" }),
    );
  }
  await assertSucceeds(
    setDoc(doc(db("admin"), "lessonMaterials", "legacy-test"), {
      theory: "Legacy",
    }),
  );
  await assertSucceeds(
    getDoc(doc(db("alice"), "lessonMaterials", "legacy-test")),
  );
  await assertFails(
    setDoc(doc(db("alice"), "lessonMaterials", "legacy-test"), {
      theory: "Overwrite",
    }),
  );
  await assertFails(
    getDoc(doc(db("bob"), "teacherLessonOverrides/alice/lessons", id)),
  );
  await assertSucceeds(
    deleteDoc(doc(db("alice"), "teacherLessonOverrides/alice/lessons", id)),
  );
});
test("server validates video metadata and presentation bounds, and hides draft blocks", async () => {
  const a = db("admin");
  const base = {
    schemaVersion: 1,
    presentationId: "new-block",
    title: "Тест блок",
    status: "draft",
    slideCount: 12,
    slides: Array.from({ length: 12 }, () => ({ text: "x" })),
    updatedBy: "admin",
    updatedAt: serverTimestamp(),
  };
  await assertSucceeds(
    setDoc(doc(a, "lessonPresentations", "new-block"), base),
  );
  await assertFails(
    getDoc(doc(db("alice"), "lessonPresentations", "new-block")),
  );
  await assertFails(
    setDoc(doc(a, "lessonPresentations", "new-block"), {
      ...base,
      slideCount: 9,
      slides: base.slides.slice(0, 9),
    }),
  );
  await assertFails(
    setDoc(doc(a, "lessonVideoMetadata", id), {
      ...video(),
      videoId: "https://evil.invalid",
    }),
  );
  await assertFails(
    setDoc(doc(a, "lessonVideoMetadata", id), {
      ...video(),
      updatedBy: "alice",
    }),
  );
  await assertFails(
    setDoc(doc(a, "lessonVideoMetadata", "unregistered"), {
      ...video(),
      lessonId: "unregistered",
    }),
  );
});
